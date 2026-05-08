import { ObservabilityMetaDTO } from '@shared/dtos/ObservabilityMetaDTO'
import { ObservabilityAttributes, ObservabilityLevel } from '@shared/observability'
import { createContext } from 'react'

export type ObservabilityContextValue = {
    captureError: (event: string, error: unknown, context?: ObservabilityAttributes) => void
    createInteractionMeta: (context?: Partial<ObservabilityMetaDTO>) => ObservabilityMetaDTO
    increment: (name: string, value?: number, tags?: ObservabilityAttributes) => void
    trackEvent: (event: string, context?: ObservabilityAttributes, level?: ObservabilityLevel) => void
    trackScreen: (screen: string, context?: ObservabilityAttributes) => void
}

export const ObservabilityContext = createContext<ObservabilityContextValue | undefined>(undefined)
