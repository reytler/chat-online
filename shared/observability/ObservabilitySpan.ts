export type ObservabilitySpan = {
    name: string
    startedAt: string
    endedAt?: string
    durationMs?: number
    status: 'started' | 'completed' | 'failed'
}
