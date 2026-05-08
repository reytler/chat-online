import { ChatLayout } from '@/Components/Chat/ChatLayout'
import { PrivateChatView } from '@/Components/Chat/PrivateChatView'
import { usePrivateChat, usePublicChat, useSession } from '@/Contexts'
import { useCallback } from 'react'
import { Navigate, useParams } from 'react-router-dom'

export function PrivateChatRoom() {
    const { roomId = '' } = useParams()
    const { user, handleLogout } = useSession()
    const { connectedUsers } = usePublicChat()
    const {
        rooms,
        invites,
        latestInviteLink,
        createPrivateInvite,
        createPrivateLinkInvite,
        respondToInvite,
        getRoomById,
        sendPrivateMessage,
        markRoomRead,
        setTyping,
        deletePrivateMessage,
        closeRoom,
    } = usePrivateChat()

    if (!user) {
        return <Navigate to="/" replace />
    }

    const room = getRoomById(roomId)

    const handleSendMessage = useCallback((content: string) => {
        return sendPrivateMessage(roomId, content)
    }, [roomId, sendPrivateMessage])

    const handleMarkRead = useCallback(() => {
        markRoomRead(roomId)
    }, [markRoomRead, roomId])

    const handleTypingChange = useCallback((isTyping: boolean) => {
        setTyping(roomId, isTyping)
    }, [roomId, setTyping])

    const handleDeleteMessage = useCallback((messageId: string) => {
        return deletePrivateMessage(roomId, messageId)
    }, [deletePrivateMessage, roomId])

    const handleCloseRoom = useCallback(() => {
        return closeRoom(roomId)
    }, [closeRoom, roomId])

    if (!room) {
        return <Navigate to="/chat" replace />
    }

    return (
        <ChatLayout
            user={user}
            connectedUsers={connectedUsers}
            rooms={rooms}
            invites={invites}
            latestInviteLink={latestInviteLink}
            activeRoomId={room.id}
            onLogout={handleLogout}
            onCreateInvite={createPrivateInvite}
            onCreateLinkInvite={createPrivateLinkInvite}
            onRespondToInvite={respondToInvite}
        >
            <PrivateChatView
                room={room}
                currentUser={user}
                onSendMessage={handleSendMessage}
                onMarkRead={handleMarkRead}
                onTypingChange={handleTypingChange}
                onDeleteMessage={handleDeleteMessage}
                onCloseRoom={handleCloseRoom}
            />
        </ChatLayout>
    )
}
