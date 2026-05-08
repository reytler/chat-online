import { ConsoleObservabilityAdapter } from './adapters/ConsoleObservabilityAdapter'
import { NoopObservabilityAdapter } from './adapters/NoopObservabilityAdapter'
import { SentryObservabilityAdapter } from './adapters/SentryObservabilityAdapter'
import { ObservabilityAdapter } from '@shared/observability'

function parseAdapterNames() {
    const configuredAdapters = import.meta.env.VITE_OBSERVABILITY_ADAPTERS ?? import.meta.env.VITE_OBSERVABILITY_ADAPTER
    const defaultAdapterName = import.meta.env.DEV ? 'console' : 'noop'

    return (configuredAdapters ?? defaultAdapterName)
        .split(',')
        .map((adapterName) => adapterName.trim().toLowerCase())
        .filter(Boolean)
}

function createAdapter(adapterName: string): ObservabilityAdapter {
    if (adapterName === 'console') {
        return new ConsoleObservabilityAdapter()
    }

    if (adapterName === 'sentry') {
        return new SentryObservabilityAdapter()
    }

    return new NoopObservabilityAdapter()
}

export function createObservabilityAdapters(): ObservabilityAdapter[] {
    return parseAdapterNames().map(createAdapter)
}

export function createObservabilityAdapter(): ObservabilityAdapter {
    return createObservabilityAdapters()[0] ?? new NoopObservabilityAdapter()
}
