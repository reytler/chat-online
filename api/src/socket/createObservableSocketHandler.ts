import { Socket } from 'socket.io'
import { ObservabilityMetaDTO } from '@shared/dtos/ObservabilityMetaDTO'
import { ObservabilityService } from '../observability/ObservabilityService'

type SocketHandler<TArgs extends unknown[]> = (...args: TArgs) => void

type CreateObservableSocketHandlerParams<TArgs extends unknown[]> = {
    socket: Socket
    observability: ObservabilityService
    eventName: string
    getContext?: (...args: TArgs) => Record<string, string | number | boolean | null | undefined>
    handler: SocketHandler<TArgs>
}

function getMetaFromPayload(payload: unknown): ObservabilityMetaDTO | undefined {
    if (!payload || typeof payload !== 'object' || !('meta' in payload)) {
        return undefined
    }

    const { meta } = payload as { meta?: ObservabilityMetaDTO }

    return meta
}

export function createObservableSocketHandler<TArgs extends unknown[]>({
    socket,
    observability,
    eventName,
    getContext,
    handler,
}: CreateObservableSocketHandlerParams<TArgs>) {
    return (...args: TArgs) => {
        const startedAt = Date.now()
        const payloadMeta = getMetaFromPayload(args[0])
        const baseContext = {
            socketId: socket.id,
            correlationId: payloadMeta?.correlationId,
            interactionId: payloadMeta?.interactionId,
            traceId: payloadMeta?.traceId,
            sessionId: payloadMeta?.sessionId,
            source: payloadMeta?.source,
            screen: payloadMeta?.screen,
            roomId: payloadMeta?.roomId,
            route: payloadMeta?.route,
            feature: payloadMeta?.feature,
        }
        const eventContext = getContext?.(...args)
        const context = {
            ...baseContext,
            ...eventContext,
        }

        observability.increment('socket.event.received_total', 1, { eventName })
        observability.debug('socket.event.received', {
            eventName,
            ...context,
        })

        try {
            handler(...args)
            observability.increment('socket.event.completed_total', 1, { eventName })
            observability.timing('socket.event.duration_ms', Date.now() - startedAt, { eventName })
            observability.debug('socket.event.completed', {
                eventName,
                ...context,
            })
        } catch (error) {
            observability.increment('socket.event.failed_total', 1, { eventName })
            observability.timing('socket.event.duration_ms', Date.now() - startedAt, { eventName, status: 'failed' })
            observability.captureError('socket.handler.error', error, {
                eventName,
                ...context,
            })
        }
    }
}
