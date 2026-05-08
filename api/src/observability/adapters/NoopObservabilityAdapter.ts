import { ObservabilityAdapter, ObservabilityLogEntry, ObservabilityMetric } from '../types'

export class NoopObservabilityAdapter implements ObservabilityAdapter {
    public log(_entry: ObservabilityLogEntry) {
        return
    }

    public metric(_metric: ObservabilityMetric) {
        return
    }
}
