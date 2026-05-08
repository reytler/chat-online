import { ObservabilityAdapter, ObservabilityLogEntry, ObservabilityMetric } from '@shared/observability'

export class ConsoleObservabilityAdapter implements ObservabilityAdapter {
    public log(entry: ObservabilityLogEntry) {
        const consoleMethod = entry.level === 'debug'
            ? console.debug
            : entry.level === 'warn'
                ? console.warn
                : entry.level === 'error'
                    ? console.error
                    : console.info

        consoleMethod(JSON.stringify({
            type: 'log',
            ...entry,
        }))
    }

    public metric(metric: ObservabilityMetric) {
        console.info(JSON.stringify({
            type: 'metric',
            ...metric,
        }))
    }
}
