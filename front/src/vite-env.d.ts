/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OBSERVABILITY_ADAPTER?: string
    readonly VITE_OBSERVABILITY_ADAPTERS?: string
    readonly VITE_OBSERVABILITY_APP_NAME?: string
    readonly VITE_OBSERVABILITY_CAPTURE_STACK?: string
    readonly VITE_OBSERVABILITY_ENABLED?: string
    readonly VITE_OBSERVABILITY_LOG_ADAPTER_FAILURES?: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_SENTRY_ENABLED?: string
    readonly VITE_SENTRY_ENVIRONMENT?: string
    readonly VITE_SENTRY_RELEASE?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
