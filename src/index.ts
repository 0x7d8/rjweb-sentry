import { MiddlewareBuilder } from "rjweb-server"
import * as Sentry from "@sentry/node"

export const sentry = new MiddlewareBuilder<Sentry.NodeOptions>()
  .init((_, config) => {
    Sentry.init(config)
  })
  .http((__, _, ctr, ctx) => {
    const scope = new Sentry.Scope()

    scope
      .setLevel('log')
      .setExtras({
        headers: ctr.headers.toJSON(),
        queries: ctr.queries.toJSON(),
        fragments: ctr.fragments.toJSON(),
        route: ctx.execute.route?.path || null,
        method: ctr.url.method,
        body: ctr.rawBody || null
      })
      .setSpan(Sentry.startTransaction({
        op: ctr.type === 'http' ? 'http-request' : 'ws-upgrade',
        name: `${ctr.type.toUpperCase()} ${ctr.url.method} ${ctr.url.href}`
      }))
      .setUser({
        ip_address: ctr.client.ip
      })

    const transaction = scope.getTransaction()!

    ctx.handleError = (err) => {
      scope.setLevel('error')
      Sentry.captureException(err, scope)

      ctx.error = err
      ctx.execute.event = 'httpError'
    }

    ctx.events.listen('requestAborted', () => {
      transaction.setHttpStatus(ctx.response.status)
      transaction.finish()
    })

    ctx.setExecuteSelf(() => {
      transaction.setHttpStatus(ctx.response.status)
      transaction.finish()
      return true
    })

    ctx.setExecuteSelf = (callback) => {
      ctx.executeSelf = async() => {
        try {
          const res = await Promise.resolve(callback())

          transaction.setHttpStatus(ctx.response.status)
          transaction.finish()

          return res
        } catch (err) {
          ctx.handleError(err)
          transaction.setHttpStatus(500)
          transaction.finish()
          return true
        }
      }
    }
  })
  .build()

/** @ts-ignore */
import { version } from "./pckg.json"
export const Version: string = version