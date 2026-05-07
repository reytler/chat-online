import { NotificationType, notify } from '@/Components/Notification'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { PrivateStateDTO } from '@shared/dtos/PrivateStateDTO'
import { Events } from '@shared/enums/enumEvents'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from './session'

type RoomOpenedPayload = {
    room: PrivateRoomDTO
    shouldNavigate: boolean
}

type PrivateChatContextValue = {
    rooms: PrivateRoomDTO[]
    invites: PrivateInviteDTO[]
    latestInviteLink: string | null
    createPrivateInvite: (targetUserId: string) => void
    createPrivateLinkInvite: () => void
    respondToInvite: (inviteId: string, accepted: boolean) => void
    joinPrivateRoomByToken: (token: string) => void
    sendPrivateMessage: (roomId: string, content: string) => void
    markRoomRead: (roomId: string) => void
    setTyping: (roomId: string, isTyping: boolean) => void
    deletePrivateMessage: (roomId: string, messageId: string) => void
    closeRoom: (roomId: string) => void
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

    function createPrivateInvite(targetUserId: string) {
        socket?.emit(Events.CREATE_PRIVATE_INVITE, { targetUserId })
    }

    function createPrivateLinkInvite() {
        socket?.emit(Events.CREATE_PRIVATE_LINK_INVITE)
    }

    function respondToInvite(inviteId: string, accepted: boolean) {
        socket?.emit(Events.RESPOND_PRIVATE_INVITE, { inviteId, accepted })
    }

    function joinPrivateRoomByToken(token: string) {
        socket?.emit(Events.JOIN_PRIVATE_ROOM_BY_LINK, { token })
    }

    function sendPrivateMessage(roomId: string, content: string) {
        const trimmedContent = content.trim()

        if (!trimmedContent) {
            return
        }

        socket?.emit(Events.SEND_PRIVATE_MESSAGE, {
            roomId,
            content: trimmedContent,
        })
    }

    function markRoomRead(roomId: string) {
        socket?.emit(Events.MARK_PRIVATE_ROOM_READ, { roomId })
    }

    function setTyping(roomId: string, isTyping: boolean) {
        socket?.emit(Events.SET_PRIVATE_TYPING, { roomId, isTyping })
    }

    function deletePrivateMessage(roomId: string, messageId: string) {
        socket?.emit(Events.DELETE_PRIVATE_MESSAGE, { roomId, messageId })
    }

    function closeRoom(roomId: string) {
        socket?.emit(Events.CLOSE_PRIVATE_ROOM, { roomId })
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

            if (activePrivateRoomId && !nextState.rooms.some((room) => room.id === activePrivateRoomId)) {
                navigate('/chat')
            }
        }

        function handlePrivateInviteReceived(invite: PrivateInviteDTO) {
            if (invite.targetUserId === user.id) {
                notify(`${invite.createdByName} convidou voce para um chat privado.`, NotificationType.INFO)
            }
        }

        function handlePrivateLinkCreated(invite: PrivateInviteDTO) {
            if (!invite.token) {
                return
            }

            const nextInviteLink = `${window.location.origin}/invite/${invite.token}`
            setLatestInviteLink(nextInviteLink)
            navigator.clipboard.writeText(nextInviteLink).catch(() => undefined)
            notify('Link privado criado e copiado para a area de transferencia.', NotificationType.SUCCESS)
        }

        function handlePrivateRoomOpened({ room, shouldNavigate }: RoomOpenedPayload) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: upsertRoom(currentState.rooms, room),
            }))

            if (shouldNavigate) {
                navigate(`/chat/private/${room.id}`)
            }
        }

        function handlePrivateRoomUpdated(updatedRoom: PrivateRoomDTO) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: upsertRoom(currentState.rooms, updatedRoom),
            }))
        }

        function handlePrivateRoomClosed(closedRoom: PrivateRoomDTO) {
            setPrivateState((currentState) => ({
                ...currentState,
                rooms: currentState.rooms.filter((room) => room.id !== closedRoom.id),
            }))

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

        function handlePrivateActionError(message: string) {
            notify(message, NotificationType.ERROR)
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
    }, [location.pathname, navigate, socket, user])

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
