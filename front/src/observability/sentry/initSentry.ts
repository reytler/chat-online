import * as Sentry from '@sentry/react'

function isSentryEnabled() {
    return import.meta.env.VITE_SENTRY_ENABLED === 'true' && Boolean(import.meta.env.VITE_SENTRY_DSN)
}

export function initSentry() {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        enabled: isSentryEnabled(),
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE,
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
