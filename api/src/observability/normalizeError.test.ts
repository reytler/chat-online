import { describe, expect, it } from 'vitest'
import { normalizeError } from './normalizeError'

describe('normalizeError', () => {
    it('normalizes Error instances', () => {
        const error = new Error('boom') as Error & { code?: string }
        error.code = 'E_BANG'

        expect(normalizeError(error)).toMatchObject({
            name: 'Error',
            message: 'boom',
            code: 'E_BANG',
        })
    })

    it('normalizes string errors', () => {
        expect(normalizeError('socket failed')).toEqual({
            name: 'UnknownError',
            message: 'socket failed',
        })
    })

    it('normalizes unknown objects with metadata', () => {
        expect(normalizeError({
            name: 'SocketError',
            message: 'Handshake failed',
            code: 'E_SOCKET',
            attempt: 2,
        })).toEqual({
            name: 'SocketError',
            message: 'Handshake failed',
            code: 'E_SOCKET',
            metadata: { attempt: 2 },
        })
    })
})
