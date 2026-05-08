import { ConsoleObservabilityAdapter } from './adapters/ConsoleObservabilityAdapter'
import { NoopObservabilityAdapter } from './adapters/NoopObservabilityAdapter'
import { ObservabilityAdapter } from './types'

function isEnabled() {
    return process.env.OBSERVABILITY_ENABLED !== 'false'
}

export function createObservabilityAdapter(): ObservabilityAdapter {
    if (!isEnabled()) {
        return new NoopObservabilityAdapter()
    }

    const adapterName = process.env.OBSERVABILITY_ADAPTER
    const defaultAdapterName = process.env.NODE_ENV === 'production' ? 'noop' : 'console'
    const resolvedAdapterName = adapterName ?? defaultAdapterName

    if (resolvedAdapterName === 'console') {
        return new ConsoleObservabilityAdapter()
    }

    return new NoopObservabilityAdapter()
}
