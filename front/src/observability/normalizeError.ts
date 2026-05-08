import { NormalizedError } from './types'

export function normalizeError(error: unknown): NormalizedError {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        }
    }

    return {
        name: 'UnknownError',
        message: typeof error === 'string' ? error : 'Unexpected error',
    }
}
