export type ObservabilityLevel = 'debug' | 'info' | 'warn' | 'error'

export type ObservabilityValue = string | number | boolean | null | undefined

export type ObservabilityAttributes = Record<string, ObservabilityValue>

export type NormalizedError = {
    name: string
    message: string
    stack?: string
}

export type ObservabilityLogEntry = {
    level: ObservabilityLevel
    event: string
    timestamp: string
    context?: ObservabilityAttributes
    error?: NormalizedError
}

export type ObservabilityMetric = {
    name: string
    value: number
    timestamp: string
    tags?: ObservabilityAttributes
}

export interface ObservabilityAdapter {
    log(entry: ObservabilityLogEntry): void
    metric(metric: ObservabilityMetric): void
}
