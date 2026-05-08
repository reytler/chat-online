import * as Sentry from '@sentry/react'
import { ObservabilityAdapter, ObservabilityLogEntry, ObservabilityMetric } from '@shared/observability'

function applyContext(scope: Sentry.Scope, entry: ObservabilityLogEntry) {
    scope.setLevel('error')
    scope.setTag('observability_event', entry.event)

    if (!entry.context) {
        return
    }

    const { socketId, route, roomId, userName, ...context } = entry.context

    if (socketId) {
        scope.setTag('socketId', String(socketId))
    }

    if (route) {
        scope.setTag('route', String(route))
    }

    if (roomId) {
        scope.setTag('roomId', String(roomId))
    }

    if (userName) {
        scope.setTag('userName', String(userName))
        scope.setUser({ username: String(userName) })
    }

    scope.setContext('observability', context)
}

function toError(entry: ObservabilityLogEntry) {
    const error = new Error(entry.error?.message ?? entry.event)

    error.name = entry.error?.name ?? 'ObservabilityError'

    if (entry.error?.stack) {
        error.stack = entry.error.stack
    }

    return error
}

export class SentryObservabilityAdapter implements ObservabilityAdapter {
    public log(entry: ObservabilityLogEntry) {
        if (entry.level !== 'error') {
            return
        }

        Sentry.withScope((scope) => {
            applyContext(scope, entry)
            Sentry.captureException(toError(entry))
        })
    }

    public metric(_metric: ObservabilityMetric) {}
}
