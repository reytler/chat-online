import { useContext } from 'react'
import { ObservabilityContext } from './observabilityContext'

export function useObservability() {
    const context = useContext(ObservabilityContext)

    if (!context) {
        throw new Error('useObservability deve ser usado dentro de ObservabilityProvider')
    }

    return context
}
