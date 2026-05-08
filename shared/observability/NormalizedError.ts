export type NormalizedError = {
    name: string
    message: string
    stack?: string
    code?: string
    cause?: string
    metadata?: Record<string, unknown>
}
