import { ConsoleObservabilityAdapter } from './adapters/ConsoleObservabilityAdapter'
import { NoopObservabilityAdapter } from './adapters/NoopObservabilityAdapter'
import { ObservabilityAdapter } from '@shared/observability'

function parseAdapterNames() {
    const configuredAdapters = process.env.OBSERVABILITY_ADAPTERS ?? process.env.OBSERVABILITY_ADAPTER
    const defaultAdapterName = process.env.NODE_ENV === 'production' ? 'noop' : 'console'

    return (configuredAdapters ?? defaultAdapterName)
        .split(',')
        .map((adapterName) => adapterName.trim().toLowerCase())
        .filter(Boolean)
}

function createAdapter(adapterName: string): ObservabilityAdapter {
    if (adapterName === 'console') {
        return new ConsoleObservabilityAdapter()
    }

    return new NoopObservabilityAdapter()
}

export function createObservabilityAdapters(): ObservabilityAdapter[] {
    return parseAdapterNames().map(createAdapter)
}

export function createObservabilityAdapter(): ObservabilityAdapter {
    return createObservabilityAdapters()[0] ?? new NoopObservabilityAdapter()
}
