import { Socket } from 'socket.io-client'
import { useEffect, useRef } from 'react'
import { useObservability } from './useObservability'

type UseSocketTrackingParams = {
    socket: Socket | null
    userId?: string
}

export function useSocketTracking({ socket, userId }: UseSocketTrackingParams) {
    const { captureError, increment, timing, trackEvent } = useObservability()
    const connectStartedAtRef = useRef(Date.now())
    const disconnectedAtRef = useRef<number | null>(null)

    useEffect(() => {
        if (!socket) {
            return
        }

        connectStartedAtRef.current = Date.now()
        trackEvent('client.socket.connecting', {
            userId,
            attempt: 1,
        })

        function handleConnect() {
            const connectionDurationMs = Date.now() - connectStartedAtRef.current
            const wasReconnect = disconnectedAtRef.current !== null
            const disconnectedDurationMs = disconnectedAtRef.current === null
                ? undefined
                : Date.now() - disconnectedAtRef.current

            timing('client.socket.connection.duration_ms', connectionDurationMs, { userId })
            trackEvent(wasReconnect ? 'client.socket.reconnected' : 'client.socket.connected', {
                socketId: socket.id,
                userId,
                connectionDurationMs,
                disconnectedDurationMs,
                attempt: socket.io._reconnectionAttempts,
            })

            disconnectedAtRef.current = null
        }

        function handleDisconnect(reason: string) {
            disconnectedAtRef.current = Date.now()
            trackEvent('client.socket.disconnected', {
                socketId: socket.id,
                userId,
                reason,
            }, 'warn')
        }

        function handleConnectError(error: Error) {
            increment('client.errors.total', 1, { userId, category: 'socket' })
            captureError('client.socket.connection_failed', error, {
                userId,
                attempt: socket.io._reconnectionAttempts,
            })
        }

        function handleReconnectAttempt(attempt: number) {
            connectStartedAtRef.current = Date.now()
            increment('client.socket.reconnect.attempts', 1, { userId })
            trackEvent('client.socket.reconnect_attempt', {
                userId,
                attempt,
            }, 'warn')
        }

        function handleReconnect(attempt: number) {
            trackEvent('client.socket.reconnect', {
                socketId: socket.id,
                userId,
                attempt,
            })
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleConnectError)
        socket.io.on('reconnect_attempt', handleReconnectAttempt)
        socket.io.on('reconnect', handleReconnect)

        return () => {
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
            socket.off('connect_error', handleConnectError)
            socket.io.off('reconnect_attempt', handleReconnectAttempt)
            socket.io.off('reconnect', handleReconnect)
        }
    }, [captureError, increment, socket, timing, trackEvent, userId])
}
