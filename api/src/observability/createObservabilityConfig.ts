import { ObservabilityConfig } from '@shared/observability'
import { createObservabilityAdapters } from './createObservabilityAdapter'

function isEnabled() {
    return process.env.OBSERVABILITY_ENABLED !== 'false'
}

function isAdapterFailureLoggingEnabled() {
    return process.env.OBSERVABILITY_LOG_ADAPTER_FAILURES === 'true' || process.env.NODE_ENV !== 'production'
}

export function createObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: isEnabled(),
        adapters: createObservabilityAdapters(),
        appName: process.env.OBSERVABILITY_APP_NAME ?? 'chat-online-api',
        environment: process.env.NODE_ENV ?? 'development',
        captureStack: process.env.OBSERVABILITY_CAPTURE_STACK !== 'false',
        logAdapterFailures: isAdapterFailureLoggingEnabled(),
    }
}
