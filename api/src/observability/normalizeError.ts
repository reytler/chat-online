import { NormalizedError } from '@shared/observability'

function getErrorMessage(error: Record<string, unknown>) {
    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message
    }

    return 'Unexpected error'
}

function getErrorName(error: Record<string, unknown>) {
    if (typeof error.name === 'string' && error.name.trim()) {
        return error.name
    }

    return 'UnknownError'
}

function getErrorCause(error: Record<string, unknown>) {
    if (typeof error.cause === 'string') {
        return error.cause
    }

    if (error.cause instanceof Error) {
        return error.cause.message
    }

    return undefined
}

export function normalizeError(error: unknown): NormalizedError {
    if (error instanceof Error) {
        const typedError = error as Error & { code?: string, cause?: unknown }

        return {
            name: typedError.name,
            message: typedError.message,
            stack: typedError.stack,
            code: typedError.code,
            cause: typedError.cause instanceof Error
                ? typedError.cause.message
                : typeof typedError.cause === 'string'
                    ? typedError.cause
                    : undefined,
        }
    }

    if (typeof error === 'string') {
        return {
            name: 'UnknownError',
            message: error,
        }
    }

    if (error && typeof error === 'object') {
        const typedError = error as Record<string, unknown>
        const { name: _name, message: _message, stack: _stack, code: _code, cause: _cause, ...metadata } = typedError

        return {
            name: getErrorName(typedError),
            message: getErrorMessage(typedError),
            stack: typeof typedError.stack === 'string' ? typedError.stack : undefined,
            code: typeof typedError.code === 'string' ? typedError.code : undefined,
            cause: getErrorCause(typedError),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }
    }

    return {
        name: 'UnknownError',
        message: 'Unexpected error',
    }
}
