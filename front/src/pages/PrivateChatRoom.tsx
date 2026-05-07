import { ChatLayout } from '@/Components/Chat/ChatLayout'
import { PrivateChatView } from '@/Components/Chat/PrivateChatView'
import { usePrivateChat, usePublicChat, useSession } from '@/Contexts'
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
                onSendMessage={(content) => sendPrivateMessage(room.id, content)}
                onMarkRead={() => markRoomRead(room.id)}
                onTypingChange={(isTyping) => setTyping(room.id, isTyping)}
                onDeleteMessage={(messageId) => deletePrivateMessage(room.id, messageId)}
                onCloseRoom={() => closeRoom(room.id)}
            />
        </ChatLayout>
    )
}
