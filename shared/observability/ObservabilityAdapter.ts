import { NormalizedError } from './NormalizedError'
import { ObservabilityContext, ObservabilityLevel } from './ObservabilityContext'

export type ObservabilityLogEntry = {
    level: ObservabilityLevel
    event: string
    timestamp: string
    context?: ObservabilityContext
    error?: NormalizedError
}

export type ObservabilityMetric = {
    name: string
    value: number
    unit?: 'count' | 'ms' | 'bytes' | 'seconds' | 'percent'
    tags?: ObservabilityContext
    timestamp: string
}

export interface ObservabilityAdapter {
    log(entry: ObservabilityLogEntry): void
    metric(metric: ObservabilityMetric): void
}
