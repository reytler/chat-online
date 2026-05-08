import { NotificationType, notify } from '@/Components/Notification'
import { useObservability } from '@/observability'
import { MessageDTO } from '@shared/dtos/MessageDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { Events } from '@shared/enums/enumEvents'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useSession } from './session'

type PublicChatContextValue = {
    connectedUsers: UserDTO[]
    messages: MessageDTO[]
    handleSendMessage: (content: string) => void
}

const PublicChatContext = createContext<PublicChatContextValue | undefined>(undefined)

export function PublicChatProvider({ children }: { children: ReactNode }) {
    const { socket, user } = useSession()
    const [connectedUsers, setConnectedUsers] = useState<UserDTO[]>([])
    const [messages, setMessages] = useState<MessageDTO[]>([])
    const { createInteractionMeta, increment, trackEvent } = useObservability()

    function handleSendMessage(content: string) {
        if (!socket?.connected || !socket.id || !user) {
            trackEvent('chat.public.message_send_blocked', {
                reason: 'session_unavailable',
            }, 'warn')
            return
        }

        const trimmedContent = content.trim()

        if (!trimmedContent) {
            return
        }

        const message: MessageDTO = {
            content: trimmedContent,
            idConnection: user.idConnection,
            userName: user.name,
            meta: createInteractionMeta({
                roomId: 'public',
                socketId: socket.id,
            }),
        }

        socket.emit(Events.SENDMESSAGE, message)
        increment('chat.public.message_send_total')
        trackEvent('chat.public.message_submitted', {
            correlationId: message.meta?.correlationId,
            messageLength: trimmedContent.length,
            socketId: socket.id,
        })
    }

    useEffect(() => {
        if (!socket) {
            return
        }

        function handleNewUser(newUser: UserDTO) {
            if (newUser.id === user?.id) {
                return
            }

            trackEvent('chat.user.joined', {
                userId: newUser.id,
            })
            notify(`${newUser.name} entrou...`, NotificationType.INFO)
        }

        function handleOffUser(offUser: UserDTO) {
            if (offUser.id === user?.id) {
                return
            }

            trackEvent('chat.user.left', {
                userId: offUser.id,
            })
            notify(`${offUser.name} saiu...`, NotificationType.INFO)
        }

        function handleMessages(nextMessages: MessageDTO[]) {
            setMessages((currentMessages) => {
                const delta = nextMessages.length - currentMessages.length
                const latestMessage = nextMessages.at(-1)

                if (delta > 0) {
                    increment('chat.public.message_receive_total', delta)
                    trackEvent('chat.public.messages_synced', {
                        correlationId: latestMessage?.meta?.correlationId,
                        delta,
                        totalMessages: nextMessages.length,
                    })
                }

                return nextMessages
            })
        }

        socket.on(Events.NEWUSER, handleNewUser)
        socket.on(Events.OFFUSER, handleOffUser)
        socket.on(Events.UPDATEUSERLIST, setConnectedUsers)
        socket.on(Events.NEWMESSAGE, handleMessages)

        return () => {
            socket.off(Events.NEWUSER, handleNewUser)
            socket.off(Events.OFFUSER, handleOffUser)
            socket.off(Events.UPDATEUSERLIST, setConnectedUsers)
            socket.off(Events.NEWMESSAGE, handleMessages)
        }
    }, [increment, socket, trackEvent, user?.id])

    return (
        <PublicChatContext.Provider value={{
            connectedUsers,
            messages,
            handleSendMessage,
        }}>
            {children}
        </PublicChatContext.Provider>
    )
}

export function usePublicChat() {
    const context = useContext(PublicChatContext)

    if (!context) {
        throw new Error('usePublicChat deve ser usado dentro de PublicChatProvider')
    }

    return context
}
