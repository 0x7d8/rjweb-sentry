import { HttpRequestContext, Middleware } from "rjweb-server"
import * as Sentry from "@sentry/node"

/** @ts-ignore */
import { version as pckgVersion } from "./pckg.json"
export const version: string = pckgVersion

export class SentryHttpRequestContext extends HttpRequestContext {
  /**
   * Get the Sentry scope for the current request
   * @since 2.1.0
   * @from @rjweb/sentry
  */ public scope(): Sentry.Scope {
    return this.context.data(sentry).scope
  }

  /**
   * Get the Sentry span for the current request
   * @since 2.1.0
   * @from @rjweb/sentry
  */ public span(): Sentry.Span | null {
    return this.context.data(sentry).span || null
  }
}

export const sentry = new Middleware<Sentry.NodeOptions, { scope: Sentry.Scope, span?: Sentry.Span }>('@rjweb/sentry', version)
  .load((config) => {
    Sentry.init(config)
  })
  .httpRequestContext(() => SentryHttpRequestContext)
  .httpRequest(async(__, _, ctx, ctr) => {
    const scope = new Sentry.Scope()
    ctx.data(sentry).scope = scope

    scope
      .setLevel('log')
      .setExtras({
        headers: ctr.headers.json(),
        queries: ctr.queries.json(),
        fragments: ctr.fragments.json(),
        route: ctx.route?.urlData.value?.toString() || null,
        method: ctr.url.method
      })
      .setUser({
        ip_address: ctr.client.ip.usual()
      })

    const span = await new Promise<Sentry.Span | undefined>((resolve) => Sentry.startSpan({
      name: `Request ${ctr.url.method} ${ctx.findRoute(ctr.url.method, ctr.url.path)?.urlData.value?.toString() ?? '404'}`,
      op: ctr.type === 'http' ? 'http-request' : 'ws-upgrade'
    }, (span) => resolve(span)))

    if (span) ctx.data(sentry).span = span

    const handleError = ctx.handleError
    ctx.handleError = (err, cause) => {
      const original = handleError.bind(ctx)(err, cause)

      scope.setLevel('error')
      Sentry.captureException(err, scope)

      return original
    }

    if (span) ctr.$abort(() => {
      Sentry.setHttpStatus(span, ctx.response.status)
      span.end()
    })
  })
  .httpRequestFinish((_, __, ctx) => {
    const span = ctx.data(sentry).span

    if (span) {
      Sentry.setHttpStatus(span, ctx.response.status)
      span.end()
    }
  })
  .export()