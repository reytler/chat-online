import { ChatLayout } from '@/Components/Chat/ChatLayout'
import { PublicChatView } from '@/Components/Chat/PublicChatView'
import { usePrivateChat, usePublicChat, useSession } from '@/Contexts'
import { Navigate } from 'react-router-dom'

export function Chat(){
    const { user, handleLogout } = useSession()
    const { connectedUsers, messages, handleSendMessage } = usePublicChat()
    const {
        rooms,
        invites,
        latestInviteLink,
        createPrivateInvite,
        createPrivateLinkInvite,
        respondToInvite,
    } = usePrivateChat()

    if (!user) {
        return <Navigate to="/" replace />
    }
    
    return(
        <ChatLayout
            user={user}
            connectedUsers={connectedUsers}
            rooms={rooms}
            invites={invites}
            latestInviteLink={latestInviteLink}
            onLogout={handleLogout}
            onCreateInvite={createPrivateInvite}
            onCreateLinkInvite={createPrivateLinkInvite}
            onRespondToInvite={respondToInvite}
        >
            <PublicChatView
                user={user}
                messages={messages}
                connectedUsers={connectedUsers}
                onSendMessage={handleSendMessage}
            />
        </ChatLayout>
    )
}
