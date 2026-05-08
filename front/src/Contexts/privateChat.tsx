import { NotificationType, notify } from '@/Components/Notification'
import { useObservability } from '@/observability'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { PrivateStateDTO } from '@shared/dtos/PrivateStateDTO'
import { Events } from '@shared/enums/enumEvents'
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ensureChatDispatch } from './chatAvailability'
import { useSession } from './session'

type RoomOpenedPayload = {
    room: PrivateRoomDTO
    shouldNavigate: boolean
}

type PrivateActionErrorPayload = {
    message: string
    meta?: {
        correlationId?: string
        interactionId?: string
        roomId?: string
    }
}

type PrivateChatContextValue = {
    rooms: PrivateRoomDTO[]
    invites: PrivateInviteDTO[]
    latestInviteLink: string | null
    createPrivateInvite: (targetUserId: string) => boolean
    createPrivateLinkInvite: () => boolean
    respondToInvite: (inviteId: string, accepted: boolean) => boolean
    joinPrivateRoomByToken: (token: string) => boolean
    sendPrivateMessage: (roomId: string, content: string) => boolean
    markRoomRead: (roomId: string) => void
    setTyping: (roomId: string, isTyping: boolean) => void
    deletePrivateMessage: (roomId: string, messageId: string) => boolean
    closeRoom: (roomId: string) => boolean
    getRoomById: (roomId: string) => PrivateRoomDTO | null
}

const PrivateChatContext = createContext<PrivateChatContextValue | undefined>(undefined)

function upsertRoom(rooms: PrivateRoomDTO[], room: PrivateRoomDTO) {
    const nextRooms = rooms.filter((currentRoom) => currentRoom.id !== room.id)
    nextRooms.push(room)

    return nextRooms.sort((firstRoom, secondRoom) => firstRoom.createdAt.localeCompare(secondRoom.createdAt))
}

export function PrivateChatProvider({ children }: { children: ReactNode }) {
    const { socket, user } = useSession()
    const navigate = useNavigate()
    const location = useLocation()
    const [privateState, setPrivateState] = useState<PrivateStateDTO>({ rooms: [], invites: [] })
    const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null)
    const { captureError, createInteractionMeta, increment, timing, trackEvent } = useObservability()
    const pendingMessagesRef = useRef(new Map<string, { startedAt: number, roomId: string }>())

    function createPrivateInvite(targetUserId: string) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.invite_create_blocked',
            blockedPayload: { targetUserId },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({
            feature: 'private-chat',
            route: location.pathname,
            socketId: socket.id,
        })

        socket.emit(Events.CREATE_PRIVATE_INVITE, { targetUserId, meta })
        increment('chat.private.invite_create_total')
        trackEvent('chat.private.invite_create_requested', {
            targetUserId,
            correlationId: meta.correlationId,
        })
        return true
    }

    function createPrivateLinkInvite() {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.link_invite_blocked',
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({
            feature: 'private-chat',
            route: location.pathname,
            socketId: socket.id,
        })

        socket.emit(Events.CREATE_PRIVATE_LINK_INVITE, { meta })
        increment('chat.private.link_invite_create_total')
        trackEvent('chat.private.link_invite_requested', {
            correlationId: meta.correlationId,
        })
        return true
    }

    function respondToInvite(inviteId: string, accepted: boolean) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.invite_response_blocked',
            blockedPayload: { inviteId, accepted },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({
            feature: 'private-chat',
            route: location.pathname,
            socketId: socket.id,
        })

        socket.emit(Events.RESPOND_PRIVATE_INVITE, { inviteId, accepted, meta })
        trackEvent('chat.private.invite_response_requested', {
            inviteId,
            accepted,
            correlationId: meta.correlationId,
        })
        return true
    }

    function joinPrivateRoomByToken(token: string) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.link_join_blocked',
            blockedPayload: { tokenLength: token.length },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({
            feature: 'private-chat',
            route: location.pathname,
            socketId: socket.id,
        })

        socket.emit(Events.JOIN_PRIVATE_ROOM_BY_LINK, { token, meta })
        trackEvent('chat.private.link_join_requested', {
            correlationId: meta.correlationId,
            tokenLength: token.length,
        })
        return true
    }

    function sendPrivateMessage(roomId: string, content: string) {
        const trimmedContent = content.trim()

        if (!trimmedContent) {
            return false
        }

        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.message_send_blocked',
            blockedPayload: { roomId },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({
            feature: 'private-chat',
            roomId,
            route: location.pathname,
            socketId: socket.id,
        })

        if (meta.correlationId) {
            pendingMessagesRef.current.set(meta.correlationId, {
                startedAt: Date.now(),
                roomId,
            })
        }

        socket.emit(Events.SEND_PRIVATE_MESSAGE, {
            roomId,
            content: trimmedContent,
            meta,
        })
        increment('chat.private.message_send_total')
        trackEvent('client.chat.message.send_started', {
            correlationId: meta.correlationId,
            interactionId: meta.interactionId,
            roomId,
            messageLength: trimmedContent.length,
        })
        trackEvent('chat.private.message_submitted', {
            correlationId: meta.correlationId,
            roomId,
            messageLength: trimmedContent.length,
        })
        return true
    }

    function markRoomRead(roomId: string) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.room_read_blocked',
            blockedPayload: { roomId },
            trackEvent,
            notifyOnBlocked: false,
        })) {
            return
        }

        const meta = createInteractionMeta({ feature: 'private-chat', roomId, route: location.pathname, socketId: socket?.id })

        socket.emit(Events.MARK_PRIVATE_ROOM_READ, { roomId, meta })
    }

    function setTyping(roomId: string, isTyping: boolean) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.typing_blocked',
            blockedPayload: { roomId, isTyping },
            trackEvent,
            notifyOnBlocked: false,
        })) {
            return
        }

        const meta = createInteractionMeta({ feature: 'private-chat', roomId, route: location.pathname, socketId: socket?.id })

        socket.emit(Events.SET_PRIVATE_TYPING, { roomId, isTyping, meta })
    }

    function deletePrivateMessage(roomId: string, messageId: string) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.message_delete_blocked',
            blockedPayload: { roomId, messageId },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({ feature: 'private-chat', roomId, route: location.pathname, socketId: socket?.id })

        socket.emit(Events.DELETE_PRIVATE_MESSAGE, { roomId, messageId, meta })
        trackEvent('chat.private.message_delete_requested', {
            roomId,
            messageId,
            correlationId: meta.correlationId,
        })
        return true
    }

    function closeRoom(roomId: string) {
        if (ensureChatDispatch({
            socket,
            hasUser: Boolean(user),
            requireUser: true,
            blockedEvent: 'chat.private.room_close_blocked',
            blockedPayload: { roomId },
            trackEvent,
        })) {
            return false
        }

        const meta = createInteractionMeta({ feature: 'private-chat', roomId, route: location.pathname, socketId: socket?.id })

        socket.emit(Events.CLOSE_PRIVATE_ROOM, { roomId, meta })
        trackEvent('chat.private.room_close_requested', {
            roomId,
            correlationId: meta.correlationId,
        })
        return true
    }

    function getRoomById(roomId: string) {
        return privateState.rooms.find((room) => room.id === roomId) ?? null
    }

    useEffect(() => {
        if (!socket || !user) {
            return
        }

        function handlePrivateStateSync(nextState: PrivateStateDTO) {
            const activePrivateRoomId = location.pathname.startsWith('/chat/private/')
                ? location.pathname.replace('/chat/private/', '')
                : null

            setPrivateState(nextState)
            trackEvent('chat.private.state_synced', {
                roomCount: nextState.rooms.length,
                inviteCount: nextState.invites.length,
            })

            if (activePrivateRoomId && !nextState.rooms.some((room) => room.id === activePrivateRoomId)) {
                navigate('/chat')
            }
        }

        function handlePrivateInviteReceived(invite: PrivateInviteDTO) {
            if (invite.targetUserId === user.id) {
                increment('chat.private.invite_received_total')
                trackEvent('chat.private.invite_received', {
                    inviteId: invite.id,
                    creatorUserId: invite.createdByUserId,
                })
                notify(`${invite.createdByName} convidou voce para um chat privado.`, NotificationType.INFO)
            }
        }

        function handlePrivateLinkCreated(invite: PrivateInviteDTO) {
            if (!invite.token) {
                return
            }

            const nextInviteLink = `${window.location.origin}/invite/${invite.token}`
            setLatestInviteLink(nextInviteLink)
            navigator.clipboard.writeText(nextInviteLink).catch((error) => {
                captureError('chat.private.link_invite_copy_failed', error, {
                    inviteId: invite.id,
                })
            })
            trackEvent('chat.private.link_invite_created', {
                inviteId: invite.id,
            })
            notify('Link privado criado e copiado para a area de transferencia.', NotificationType.SUCCESS)
        }

        function handlePrivateRoomOpened({ room, shouldNavigate }: RoomOpenedPayload) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: upsertRoom(currentState.rooms, room),
            }))
            trackEvent('chat.private.room_opened', {
                roomId: room.id,
                participantCount: room.participants.length,
                shouldNavigate,
            })

            if (shouldNavigate) {
                navigate(`/chat/private/${room.id}`)
            }
        }

        function handlePrivateRoomUpdated(updatedRoom: PrivateRoomDTO) {
            setPrivateState((currentState) => {
                const previousRoom = currentState.rooms.find((room) => room.id === updatedRoom.id)
                const delta = updatedRoom.messages.length - (previousRoom?.messages.length ?? 0)

                if (delta > 0) {
                    const nextMessages = updatedRoom.messages.slice(previousRoom?.messages.length ?? 0)
                    const latestMessage = nextMessages.at(-1)

                    increment('chat.private.message_receive_total', delta)

                    for (const nextMessage of nextMessages) {
                        trackEvent('client.chat.message.received', {
                            correlationId: nextMessage.meta?.correlationId,
                            interactionId: nextMessage.meta?.interactionId,
                            roomId: updatedRoom.id,
                            messageLength: nextMessage.content.length,
                            origin: nextMessage.senderId === user.id ? 'self' : 'remote',
                        })

                        const correlationId = nextMessage.meta?.correlationId

                        if (!correlationId) {
                            continue
                        }

                        const pendingMessage = pendingMessagesRef.current.get(correlationId)

                        if (!pendingMessage) {
                            continue
                        }

                        const confirmationDurationMs = Date.now() - pendingMessage.startedAt

                        timing('client.chat.message.confirmation.duration_ms', confirmationDurationMs, {
                            roomId: pendingMessage.roomId,
                        })
                        trackEvent('client.chat.message.send_confirmed', {
                            correlationId,
                            interactionId: nextMessage.meta?.interactionId,
                            confirmationDurationMs,
                            roomId: pendingMessage.roomId,
                        })
                        pendingMessagesRef.current.delete(correlationId)
                    }

                    trackEvent('chat.private.messages_synced', {
                        correlationId: latestMessage?.meta?.correlationId,
                        roomId: updatedRoom.id,
                        delta,
                        totalMessages: updatedRoom.messages.length,
                    })
                }

                return {
                    ...currentState,
                    rooms: upsertRoom(currentState.rooms, updatedRoom),
                }
            })
        }

        function handlePrivateRoomClosed(closedRoom: PrivateRoomDTO) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: currentState.rooms.filter((room) => room.id !== closedRoom.id),
            }))
            trackEvent('chat.private.room_closed', {
                roomId: closedRoom.id,
            })

            if (location.pathname === `/chat/private/${closedRoom.id}`) {
                navigate('/chat')
            }
        }

        function handlePrivateTypingUpdated(payload: { roomId: string, activeTypingUserIds: string[] }) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: currentState.rooms.map((room) => room.id === payload.roomId
                    ? { ...room, activeTypingUserIds: payload.activeTypingUserIds }
                    : room),
            }))
        }

        function handlePrivateActionError(payload: string | PrivateActionErrorPayload) {
            const errorPayload = typeof payload === 'string'
                ? { message: payload }
                : payload

            if (errorPayload.meta?.correlationId) {
                const pendingMessage = pendingMessagesRef.current.get(errorPayload.meta.correlationId)

                if (pendingMessage) {
                    increment('client.chat.message.failed.total')
                    trackEvent('client.chat.message.send_failed', {
                        correlationId: errorPayload.meta.correlationId,
                        interactionId: errorPayload.meta.interactionId,
                        roomId: pendingMessage.roomId,
                        reason: errorPayload.message,
                    }, 'warn')
                    pendingMessagesRef.current.delete(errorPayload.meta.correlationId)
                }
            }

            trackEvent('chat.private.action_error_received', {
                correlationId: errorPayload.meta?.correlationId,
                reason: errorPayload.message,
            }, 'warn')
            notify(errorPayload.message, NotificationType.ERROR)
        }

        socket.on(Events.PRIVATE_STATE_SYNC, handlePrivateStateSync)
        socket.on(Events.PRIVATE_INVITE_RECEIVED, handlePrivateInviteReceived)
        socket.on(Events.PRIVATE_LINK_CREATED, handlePrivateLinkCreated)
        socket.on(Events.PRIVATE_ROOM_OPENED, handlePrivateRoomOpened)
        socket.on(Events.PRIVATE_ROOM_UPDATED, handlePrivateRoomUpdated)
        socket.on(Events.PRIVATE_ROOM_CLOSED, handlePrivateRoomClosed)
        socket.on(Events.PRIVATE_TYPING_UPDATED, handlePrivateTypingUpdated)
        socket.on(Events.PRIVATE_ACTION_ERROR, handlePrivateActionError)

        return () => {
            socket.off(Events.PRIVATE_STATE_SYNC, handlePrivateStateSync)
            socket.off(Events.PRIVATE_INVITE_RECEIVED, handlePrivateInviteReceived)
            socket.off(Events.PRIVATE_LINK_CREATED, handlePrivateLinkCreated)
            socket.off(Events.PRIVATE_ROOM_OPENED, handlePrivateRoomOpened)
            socket.off(Events.PRIVATE_ROOM_UPDATED, handlePrivateRoomUpdated)
            socket.off(Events.PRIVATE_ROOM_CLOSED, handlePrivateRoomClosed)
            socket.off(Events.PRIVATE_TYPING_UPDATED, handlePrivateTypingUpdated)
            socket.off(Events.PRIVATE_ACTION_ERROR, handlePrivateActionError)
        }
    }, [captureError, increment, location.pathname, navigate, socket, timing, trackEvent, user])

    useEffect(() => {
        if (user) {
            return
        }

        setPrivateState({ rooms: [], invites: [] })
        setLatestInviteLink(null)
    }, [user])

    return (
        <PrivateChatContext.Provider value={{
            rooms: privateState.rooms,
            invites: privateState.invites,
            latestInviteLink,
            createPrivateInvite,
            createPrivateLinkInvite,
            respondToInvite,
            joinPrivateRoomByToken,
            sendPrivateMessage,
            markRoomRead,
            setTyping,
            deletePrivateMessage,
            closeRoom,
            getRoomById,
        }}>
            {children}
        </PrivateChatContext.Provider>
    )
}

export function usePrivateChat() {
    const context = useContext(PrivateChatContext)

    if (!context) {
        throw new Error('usePrivateChat deve ser usado dentro de PrivateChatProvider')
    }

    return context
}
