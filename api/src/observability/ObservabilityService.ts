import { normalizeError } from './normalizeError'
import {
    ObservabilityAdapter,
    ObservabilityAttributes,
    ObservabilityConfig,
    ObservabilityLevel,
    ObservabilityLogEntry,
    ObservabilityMetric,
} from '@shared/observability'

export class ObservabilityService {
    public constructor(private readonly config: ObservabilityConfig) {}

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
        this.writeLog({
            level: 'error',
            event,
            timestamp: new Date().toISOString(),
            context: this.withBaseContext(context),
            error: normalizeError(error),
        })
    }

    public increment(name: string, value = 1, tags?: ObservabilityAttributes) {
        this.writeMetric({
            name,
            value,
            unit: 'count',
            tags: this.withBaseContext(tags),
            timestamp: new Date().toISOString(),
        })
    }

    public gauge(name: string, value: number, tags?: ObservabilityAttributes) {
        this.writeMetric({
            name,
            value,
            tags: this.withBaseContext(tags),
            timestamp: new Date().toISOString(),
        })
    }

    public timing(name: string, value: number, tags?: ObservabilityAttributes) {
        this.writeMetric({
            name,
            value,
            unit: 'ms',
            tags: this.withBaseContext(tags),
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
        this.writeLog({
            level,
            event,
            timestamp: new Date().toISOString(),
            context: this.withBaseContext(context),
        })
    }

    private withBaseContext(context?: ObservabilityAttributes) {
        return {
            appName: this.config.appName,
            environment: this.config.environment,
            ...context,
        }
    }

    private writeLog(entry: ObservabilityLogEntry) {
        this.forEachAdapter((adapter) => adapter.log(entry))
    }

    private writeMetric(metric: ObservabilityMetric) {
        this.forEachAdapter((adapter) => adapter.metric(metric))
    }

    private forEachAdapter(operation: (adapter: ObservabilityAdapter) => void) {
        if (!this.config.enabled) {
            return
        }

        for (const adapter of this.config.adapters) {
            try {
                operation(adapter)
            } catch (error) {
                this.reportAdapterFailure(error)
            }
        }
    }

    private reportAdapterFailure(error: unknown) {
        if (!this.config.logAdapterFailures) {
            return
        }

        console.warn('[observability] adapter failure', normalizeError(error))
    }
}
