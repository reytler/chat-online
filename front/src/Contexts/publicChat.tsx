import { NotificationType, notify } from '@/Components/Notification'
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

    function handleSendMessage(content: string) {
        if (!socket || !user) {
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
        }

        socket.emit(Events.SENDMESSAGE, message)
    }

    useEffect(() => {
        if (!socket) {
            return
        }

        function handleNewUser(newUser: UserDTO) {
            if (newUser.id === user?.id) {
                return
            }

            notify(`${newUser.name} entrou...`, NotificationType.INFO)
        }

        function handleOffUser(offUser: UserDTO) {
            if (offUser.id === user?.id) {
                return
            }

            notify(`${offUser.name} saiu...`, NotificationType.INFO)
        }

        socket.on(Events.NEWUSER, handleNewUser)
        socket.on(Events.OFFUSER, handleOffUser)
        socket.on(Events.UPDATEUSERLIST, setConnectedUsers)
        socket.on(Events.NEWMESSAGE, setMessages)

        return () => {
            socket.off(Events.NEWUSER, handleNewUser)
            socket.off(Events.OFFUSER, handleOffUser)
            socket.off(Events.UPDATEUSERLIST, setConnectedUsers)
            socket.off(Events.NEWMESSAGE, setMessages)
        }
    }, [socket, user?.id])

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
