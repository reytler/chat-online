import { ObservabilityAdapter } from './ObservabilityAdapter'

export type ObservabilityConfig = {
    enabled: boolean
    adapters: ObservabilityAdapter[]
    appName?: string
    environment?: string
    captureStack?: boolean
    logAdapterFailures?: boolean
}
