import { ObservabilityAdapter, ObservabilityLogEntry, ObservabilityMetric } from '@shared/observability'

export class NoopObservabilityAdapter implements ObservabilityAdapter {
    public log(_entry: ObservabilityLogEntry) {
        return
    }

    public metric(_metric: ObservabilityMetric) {
        return
    }
}
