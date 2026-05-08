import { normalizeError } from './normalizeError'
import { ObservabilityAdapter, ObservabilityAttributes, ObservabilityLevel } from './types'

export class ObservabilityService {
    public constructor(private readonly adapter: ObservabilityAdapter) {}

    public debug(event: string, context?: ObservabilityAttributes) {
        this.log('debug', event, context)
    }

    public info(event: string, context?: ObservabilityAttributes) {
        this.log('info', event, context)
    }

    public warn(event: string, context?: ObservabilityAttributes) {
        this.log('warn', event, context)
    }

    public error(event: string, context?: ObservabilityAttributes) {
        this.log('error', event, context)
    }

    public captureError(event: string, error: unknown, context?: ObservabilityAttributes) {
        this.adapter.log({
            level: 'error',
            event,
            timestamp: new Date().toISOString(),
            context,
            error: normalizeError(error),
        })
    }

    public increment(name: string, value = 1, tags?: ObservabilityAttributes) {
        this.adapter.metric({
            name,
            value,
            unit: 'count',
            tags,
            timestamp: new Date().toISOString(),
        })
    }

    public gauge(name: string, value: number, tags?: ObservabilityAttributes) {
        this.adapter.metric({
            name,
            value,
            tags,
            timestamp: new Date().toISOString(),
        })
    }

    public timing(name: string, value: number, tags?: ObservabilityAttributes) {
        this.adapter.metric({
            name,
            value,
            unit: 'ms',
            tags,
            timestamp: new Date().toISOString(),
        })
    }

    public runtimeSnapshot(context?: ObservabilityAttributes) {
        const memoryUsage = process.memoryUsage()

        this.gauge('runtime.process.uptime_seconds', process.uptime(), context)
        this.gauge('runtime.process.memory_rss_bytes', memoryUsage.rss, context)
        this.gauge('runtime.process.memory_heap_used_bytes', memoryUsage.heapUsed, context)
    }

    private log(level: ObservabilityLevel, event: string, context?: ObservabilityAttributes) {
        this.adapter.log({
            level,
            event,
            timestamp: new Date().toISOString(),
            context,
        })
    }
}
