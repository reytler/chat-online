import { Button } from '@/Components/ui/button'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PrivateSidebar } from './PrivateSidebar'

type ChatLayoutProps = {
    user: UserDTO
    connectedUsers: UserDTO[]
    rooms: PrivateRoomDTO[]
    invites: PrivateInviteDTO[]
    latestInviteLink: string | null
    activeRoomId?: string
    onLogout: () => void
    onCreateInvite: (targetUserId: string) => void
    onCreateLinkInvite: () => void
    onRespondToInvite: (inviteId: string, accepted: boolean) => void
    children: ReactNode
}

export function ChatLayout({
    user,
    connectedUsers,
    rooms,
    invites,
    latestInviteLink,
    activeRoomId,
    onLogout,
    onCreateInvite,
    onCreateLinkInvite,
    onRespondToInvite,
    children,
}: ChatLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between gap-4 border-b bg-background p-4">
                <div>
                    <p className="text-sm text-muted-foreground">Ola, {user.name}</p>
                    <Link to="/chat" className="text-lg font-semibold">Voltar para a sala publica</Link>
                </div>
                <Button onClick={onLogout}>Sair</Button>
            </header>

            <div className="flex flex-1 flex-col md:flex-row">
                <main className="min-h-[55vh] flex-1">{children}</main>
                <PrivateSidebar
                    currentUser={user}
                    connectedUsers={connectedUsers}
                    rooms={rooms}
                    invites={invites}
                    latestInviteLink={latestInviteLink}
                    activeRoomId={activeRoomId}
                    onCreateInvite={onCreateInvite}
                    onCreateLinkInvite={onCreateLinkInvite}
                    onRespondToInvite={onRespondToInvite}
                />
            </div>
        </div>
    )
}
