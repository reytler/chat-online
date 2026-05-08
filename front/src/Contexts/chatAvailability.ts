import { NotificationType, notify } from '@/Components/Notification'
import { Socket } from 'socket.io-client'

export const CHAT_UNAVAILABLE_MESSAGE = 'Sem conexao com o chat no momento. Tente novamente quando a conexao voltar.'

type TrackEvent = (eventName: string, data?: Record<string, unknown>, level?: 'info' | 'warn' | 'error') => void

type EnsureDispatchOptions = {
    socket: Socket | null
    hasUser?: boolean
    requireUser?: boolean
    blockedEvent: string
    blockedPayload?: Record<string, unknown>
    trackEvent: TrackEvent
    notifyOnBlocked?: boolean
}

export function isSocketReady(socket: Socket | null): socket is Socket {
    return Boolean(socket?.connected && socket.id)
}

export function ensureChatDispatch({
    socket,
    hasUser = false,
    requireUser = false,
    blockedEvent,
    blockedPayload,
    trackEvent,
    notifyOnBlocked = true,
}: EnsureDispatchOptions) {
    const reason = !isSocketReady(socket)
        ? 'socket_unavailable'
        : requireUser && !hasUser
            ? 'session_unavailable'
            : null

    if (!reason) {
        return false
    }

    trackEvent(blockedEvent, {
        reason,
        ...blockedPayload,
    }, 'warn')

    if (notifyOnBlocked) {
        notify(CHAT_UNAVAILABLE_MESSAGE, NotificationType.ERROR)
    }

    return true
}
