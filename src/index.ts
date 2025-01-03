import { HttpRequestContext, Middleware } from "rjweb-server"
import * as Sentry from "@sentry/node"

/** @ts-ignore */
import { version as pckgVersion } from "./pckg.json"
export const version: string = pckgVersion

export class SentryHttpRequestContext extends HttpRequestContext {
  /**
   * Get the Sentry scope for the current request
   * @since 2.1.0
   * @from \@rjweb/sentry
  */ public scope(): Sentry.Scope {
    return this.context.data(sentry).scope
  }

  /**
   * Get the Sentry span for the current request
   * @since 2.1.0
   * @from \@rjweb/sentry
  */ public span(): Sentry.Span | null {
    return this.context.data(sentry).span || null
  }
}

export const sentry = new Middleware<Sentry.NodeOptions & { span404?: boolean, includeBody?: boolean }, { scope: Sentry.Scope, span?: Sentry.Span }>('@rjweb/sentry', version)
  .load((config) => {
    Sentry.init({
      tracesSampleRate: 0.5,
      ...config
    })
  })
  .httpRequestContext(() => SentryHttpRequestContext)
  .httpRequest(async({ span404, includeBody }, _, ctx, ctr) => {
    const scope = new Sentry.Scope()
    ctx.data(sentry).scope = scope

    scope
      .setLevel('log')
      .setUser({
        ip_address: ctr.client.ip.usual()
      })

    const route = ctx.findRoute(ctr.url.method, ctr.url.path)
    const span = route || span404 ? await new Promise<Sentry.Span | undefined>((resolve) => Sentry.startSpanManual({
      name: `Request ${ctr.url.method} ${route?.urlData.value?.toString() ?? '404'}`,
      op: ctr.type === 'http' ? 'http.server' :  'ws.server',
    }, (span) => resolve(span))) : undefined

    if (span) ctx.data(sentry).span = span

    if (span) {
      span.setAttribute('headers', JSON.stringify(ctr.headers.json()))
      span.setAttribute('queries', JSON.stringify(ctr.queries.json()))
      span.setAttribute('fragments', JSON.stringify(ctr.fragments.json()))
      span.setAttribute('params', JSON.stringify(ctr.params.json()))
      span.setAttribute('method', ctr.url.method)
    }

    const handleError = ctx.handleError
    ctx.handleError = (err, cause) => {
      const original = handleError.bind(ctx)(err, cause)

      scope.setLevel('error')
      Sentry.captureException(err, scope)

      return original
    }

    if (span) ctr.$abort(() => {
      if (includeBody && ctx.body.raw) span.setAttribute('body', ctx.body.raw.toString())

      Sentry.setHttpStatus(span, ctx.response.status)
      span.end()
    })
  })
  .httpRequestFinish(async({ includeBody }, __, ctx) => {
    const span = ctx.data(sentry).span

    if (span) {
      if (includeBody && ctx.body.raw) span.setAttribute('body', ctx.body.raw.toString())

      Sentry.setHttpStatus(span, ctx.response.status)
      span.end()
    }
  })
  .export()