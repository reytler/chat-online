import { NextFunction, Request, Response } from 'express'
import { ObservabilityService } from './ObservabilityService'

function getRouteLabel(request: Request) {
    return request.route?.path ?? request.path
}

export function createHttpErrorMiddleware(observability: ObservabilityService) {
    return function httpErrorMiddleware(error: unknown, request: Request, response: Response, _next: NextFunction) {
        const statusCode = response.statusCode >= 400 ? response.statusCode : 500
        const context = {
            source: 'api' as const,
            method: request.method,
            route: getRouteLabel(request),
            statusCode,
            requestId: request.header('x-request-id') ?? undefined,
        }

        observability.captureError('http.request.failed', error, context)

        if (response.headersSent) {
            return
        }

        response.status(statusCode).json({
            message: 'Internal server error',
        })
    }
}
