import { NotificationType, notify } from '@/Components/Notification'
import { UserDTO } from '@shared/dtos/UserDTO'
import { Events } from '@shared/enums/enumEvents'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'

type LoginInput = Omit<UserDTO, 'id' | 'idConnection'>

type SessionContextValue = {
    socket: Socket | null
    socketId: string
    user: UserDTO | null
    handleLogin: (userData: LoginInput, options?: { redirectTo?: string }) => void
    handleLogout: () => void
}

const STORAGE_KEY = 'chat-online:user'

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

function createSessionUser(userData: LoginInput, socketId: string, currentUser: UserDTO | null): UserDTO {
    return {
        id: currentUser?.id ?? crypto.randomUUID(),
        ...userData,
        idConnection: socketId,
    }
}

function readStoredUser() {
    const rawUser = window.localStorage.getItem(STORAGE_KEY)

    if (!rawUser) {
        return null
    }

    try {
        return JSON.parse(rawUser) as UserDTO
    } catch {
        window.localStorage.removeItem(STORAGE_KEY)
        return null
    }
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [socketId, setSocketId] = useState('')
    const [user, setUser] = useState<UserDTO | null>(() => readStoredUser())
    const navigate = useNavigate()

    function handleLogin(userData: LoginInput, options?: { redirectTo?: string }) {
        if (!socket?.connected || !socket.id) {
            notify('Conexao com o socket indisponivel. Tente novamente.', NotificationType.ERROR)
            return
        }

        const nextUser = createSessionUser(userData, socket.id, user)

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
        setUser(nextUser)
        socket.emit(Events.SETUSER, nextUser)
        navigate(options?.redirectTo ?? '/chat')
    }

    function handleLogout() {
        if (socket?.connected && user) {
            socket.emit(Events.REMOVEUSER)
        }

        window.localStorage.removeItem(STORAGE_KEY)
        setUser(null)
        navigate('/')
    }

    useEffect(() => {
        const socketIo = io('http://localhost:3001')

        setSocket(socketIo)

        socketIo.on('connect', () => {
            setSocketId(socketIo.id ?? '')
        })

        socketIo.on('disconnect', () => {
            setSocketId('')
        })

        return () => {
            socketIo.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!socket?.connected || !socket.id || !user) {
            return
        }

        const nextUser = {
            ...user,
            idConnection: socket.id,
        }

        if (user.idConnection === socket.id) {
            socket.emit(Events.SETUSER, nextUser)
            return
        }

        setUser(nextUser)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
        socket.emit(Events.SETUSER, nextUser)
    }, [socket, socketId, user])

    return (
        <SessionContext.Provider value={{
            socket,
            socketId,
            user,
            handleLogin,
            handleLogout,
        }}>
            {children}
        </SessionContext.Provider>
    )
}

export function useSession() {
    const context = useContext(SessionContext)

    if (!context) {
        throw new Error('useSession deve ser usado dentro de SessionProvider')
    }

    return context
}
