export type ObservabilityMetaDTO = {
    correlationId?: string
    sessionId?: string
    screen?: string
    source?: 'front' | 'api'
    socketId?: string
    roomId?: string
}
