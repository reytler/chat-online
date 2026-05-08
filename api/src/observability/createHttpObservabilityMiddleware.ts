import { NextFunction, Request, Response } from 'express'
import { ObservabilityService } from './ObservabilityService'

function getRouteLabel(request: Request) {
    return request.route?.path ?? request.path
}

export function createHttpObservabilityMiddleware(observability: ObservabilityService) {
    return function httpObservabilityMiddleware(request: Request, response: Response, next: NextFunction) {
        const startedAt = Date.now()
        const requestId = request.header('x-request-id') ?? undefined
        const context = {
            source: 'api' as const,
            requestId,
            method: request.method,
            route: getRouteLabel(request),
        }

        observability.increment('http.requests.started_total', 1, context)
        observability.info('http.request.started', context)

        response.on('finish', () => {
            const durationMs = Date.now() - startedAt
            const finishedContext = {
                ...context,
                route: getRouteLabel(request),
                statusCode: response.statusCode,
                durationMs,
            }

            observability.increment('http.requests.completed_total', 1, finishedContext)
            observability.timing('http.request.duration_ms', durationMs, finishedContext)
            observability.info('http.request.finished', finishedContext)
        })

        response.on('close', () => {
            if (response.writableEnded) {
                return
            }

            observability.warn('http.request.aborted', {
                ...context,
                durationMs: Date.now() - startedAt,
            })
        })

        next()
    }
}
