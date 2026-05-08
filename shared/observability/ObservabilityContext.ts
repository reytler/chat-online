export type ObservabilityLevel = 'debug' | 'info' | 'warn' | 'error'

export type ObservabilityValue = string | number | boolean | null | undefined

export type ObservabilityAttributes = Record<string, ObservabilityValue>

export type ObservabilitySource = 'front' | 'api'

export interface ObservabilityContext extends ObservabilityAttributes {
    correlationId?: string
    interactionId?: string
    traceId?: string
    sessionId?: string
    screen?: string
    route?: string
    feature?: string
    source?: ObservabilitySource
    socketId?: string
    roomId?: string
    userId?: string
    userName?: string
}
