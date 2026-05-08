import * as Sentry from '@sentry/node'

function isSentryEnabled() {
    return process.env.SENTRY_ENABLED === 'true' && Boolean(process.env.SENTRY_DSN)
}

export function initSentry() {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        enabled: isSentryEnabled(),
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
        release: process.env.SENTRY_RELEASE,
        maxBreadcrumbs: 0,
        defaultIntegrations: false,
        beforeSend(event) {
            if (event.exception?.values?.length) {
                return event
            }

            return event.level === 'error' ? event : null
        },
    })
}
