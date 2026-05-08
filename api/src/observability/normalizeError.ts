import { NormalizedError } from '@shared/observability'

export function normalizeError(error: unknown): NormalizedError {
    if (error instanceof Error) {
        const typedError = error as Error & { code?: string }

        return {
            name: typedError.name,
            message: typedError.message,
            stack: typedError.stack,
            code: typedError.code,
        }
    }

    return {
        name: 'UnknownError',
        message: typeof error === 'string' ? error : 'Unexpected error',
    }
}
