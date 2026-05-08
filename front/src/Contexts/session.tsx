import { ensureChatDispatch, isSocketReady } from './chatAvailability'
import { useObservability } from '@/observability'
import { useSocketTracking } from '@/observability/useSocketTracking'
import { UserDTO } from '@shared/dtos/UserDTO'
import { Events } from '@shared/enums/enumEvents'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'

type LoginInput = Omit<UserDTO, 'id' | 'idConnection'>

type SessionContextValue = {
    socket: Socket | null
    socketId: string
    isSocketReady: boolean
    user: UserDTO | null
    handleLogin: (userData: LoginInput, options?: { redirectTo?: string }) => boolean
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
    const { captureError, increment, trackEvent } = useObservability()
    const socketReady = isSocketReady(socket)

    useSocketTracking({
        socket,
        userId: user?.id,
    })

    function handleLogin(userData: LoginInput, options?: { redirectTo?: string }) {
        if (ensureChatDispatch({
            socket,
            blockedEvent: 'chat.session.login_blocked',
            trackEvent,
        })) {
            return false
        }

        const nextUser = createSessionUser(userData, socket.id, user)

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
        setUser(nextUser)
        socket.emit(Events.SETUSER, nextUser)
        increment('chat.session.login_total')
        trackEvent('chat.session.login_submitted', {
            userId: nextUser.id,
            socketId: socket.id,
            redirectTo: options?.redirectTo ?? '/chat',
        })
        navigate(options?.redirectTo ?? '/chat')
        return true
    }

    function handleLogout() {
        if (socket?.connected && user) {
            socket.emit(Events.REMOVEUSER)
        }

        trackEvent('chat.session.logout_requested', {
            userId: user?.id,
            socketId: socket?.id,
        })

        window.localStorage.removeItem(STORAGE_KEY)
        setUser(null)
        navigate('/')
    }

    useEffect(() => {
        const socketIo = io('http://localhost:3001')

        setSocket(socketIo)

        socketIo.on('connect', () => {
            setSocketId(socketIo.id ?? '')
            increment('chat.socket.connected_total')
            trackEvent('chat.socket.connected', {
                socketId: socketIo.id,
            })
        })

        socketIo.on('disconnect', () => {
            setSocketId('')
            trackEvent('chat.socket.disconnected', {
                socketId: socketIo.id,
            }, 'warn')
        })

        socketIo.on('connect_error', (error) => {
            captureError('chat.socket.connect_error', error)
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
            trackEvent('chat.session.user_resynced', {
                userId: nextUser.id,
                socketId: socket.id,
            })
            return
        }

        setUser(nextUser)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
        socket.emit(Events.SETUSER, nextUser)
        trackEvent('chat.session.socket_rebound', {
            userId: nextUser.id,
            socketId: socket.id,
        })
    }, [socket, socketId, user])

    return (
        <SessionContext.Provider value={{
            socket,
            socketId,
            isSocketReady: socketReady,
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
