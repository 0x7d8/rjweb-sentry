import { Middleware } from "rjweb-server"
import * as Sentry from "@sentry/node"

/** @ts-ignore */
import { version as pckgVersion } from "./pckg.json"
export const version: string = pckgVersion

export const sentry = new Middleware<Sentry.NodeOptions, { scope: Sentry.Scope }>('@rjweb/sentry', version)
  .load((config) => {
    Sentry.init(config)
  })
  .httpRequest((__, _, ctx, ctr) => {
    const scope = new Sentry.Scope()
    ctx.data(sentry).scope = scope

    scope
      .setLevel('log')
      .setExtras({
        headers: ctr.headers.toJSON(),
        queries: ctr.queries.toJSON(),
        fragments: ctr.fragments.toJSON(),
        route: ctx.route?.urlData.value?.toString() || null,
        method: ctr.url.method,
        body: ctr.rawBody || null
      })
      .setSpan(Sentry.startTransaction({
        op: ctr.type === 'http' ? 'http-request' : 'ws-upgrade',
        name: `${ctr.type.toUpperCase()} ${ctr.url.method} ${ctx.route?.urlData.value?.toString() ?? '404'}`
      }))
      .setUser({
        ip_address: ctr.client.ip.usual()
      })

    const transaction = scope.getTransaction()!

    const handleError = ctx.handleError
    ctx.handleError = (err, cause) => {
      const original = handleError(err, cause)

      scope.setLevel('error')
      Sentry.captureException(err, scope)

      return original
    }

    ctr.$abort(() => {
      transaction.setHttpStatus(ctx.response.status)
      transaction.finish()
    })
  })
  .httpRequestFinish((_, __, ctx) => {
    const transaction = ctx.data(sentry).scope.getTransaction()!

    transaction.setHttpStatus(ctx.response.status)
    transaction.finish()
  })
  .export()