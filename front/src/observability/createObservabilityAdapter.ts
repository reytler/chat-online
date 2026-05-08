import { ConsoleObservabilityAdapter } from './adapters/ConsoleObservabilityAdapter'
import { NoopObservabilityAdapter } from './adapters/NoopObservabilityAdapter'
import { ObservabilityAdapter } from './types'

function isEnabled() {
    return import.meta.env.VITE_OBSERVABILITY_ENABLED !== 'false'
}

export function createObservabilityAdapter(): ObservabilityAdapter {
    if (!isEnabled()) {
        return new NoopObservabilityAdapter()
    }

    const adapterName = import.meta.env.VITE_OBSERVABILITY_ADAPTER
    const defaultAdapterName = import.meta.env.DEV ? 'console' : 'noop'
    const resolvedAdapterName = adapterName ?? defaultAdapterName

    if (resolvedAdapterName === 'console') {
        return new ConsoleObservabilityAdapter()
    }

    return new NoopObservabilityAdapter()
}
