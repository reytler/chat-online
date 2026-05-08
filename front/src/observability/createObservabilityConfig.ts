import { ObservabilityConfig } from '@shared/observability'
import { createObservabilityAdapters } from './createObservabilityAdapter'

function isEnabled() {
    return import.meta.env.VITE_OBSERVABILITY_ENABLED !== 'false'
}

function isAdapterFailureLoggingEnabled() {
    return import.meta.env.DEV || import.meta.env.VITE_OBSERVABILITY_LOG_ADAPTER_FAILURES === 'true'
}

export function createObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: isEnabled(),
        adapters: createObservabilityAdapters(),
        appName: import.meta.env.VITE_OBSERVABILITY_APP_NAME ?? 'chat-online-front',
        environment: import.meta.env.MODE,
        captureStack: import.meta.env.VITE_OBSERVABILITY_CAPTURE_STACK !== 'false',
        logAdapterFailures: isAdapterFailureLoggingEnabled(),
    }
}
