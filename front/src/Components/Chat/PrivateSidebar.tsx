import { Button } from '@/Components/ui/button'
import { ScrollArea } from '@/Components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { Link } from 'react-router-dom'

type PrivateSidebarProps = {
    currentUser: UserDTO
    connectedUsers: UserDTO[]
    rooms: PrivateRoomDTO[]
    invites: PrivateInviteDTO[]
    latestInviteLink: string | null
    activeRoomId?: string
    onCreateInvite: (targetUserId: string) => void
    onCreateLinkInvite: () => void
    onRespondToInvite: (inviteId: string, accepted: boolean) => void
}

export function PrivateSidebar({
    currentUser,
    connectedUsers,
    rooms,
    invites,
    latestInviteLink,
    activeRoomId,
    onCreateInvite,
    onCreateLinkInvite,
    onRespondToInvite,
}: PrivateSidebarProps) {
    const directInvites = invites.filter((invite) => invite.type === 'direct')
    const onlineUsers = connectedUsers.filter((connectedUser) => connectedUser.id !== currentUser.id)

    function hasOpenRoomWithUser(targetUserId: string) {
        return rooms.some((room) => room.lifecycle === 'open' && room.participants.some((participant) => participant.userId === currentUser.id) && room.participants.some((participant) => participant.userId === targetUserId))
    }

    function hasPendingDirectInviteWithUser(targetUserId: string) {
        return directInvites.some((invite) => invite.status === 'pending'
            && ((invite.createdByUserId === currentUser.id && invite.targetUserId === targetUserId)
                || (invite.createdByUserId === targetUserId && invite.targetUserId === currentUser.id)))
    }

    return (
        <aside className="flex w-full max-w-sm flex-col border-l bg-muted/30 md:w-96">
            <div className="space-y-3 border-b p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h2 className="font-semibold">Chats privados</h2>
                        <p className="text-sm text-muted-foreground">Convites 1:1 e salas ativas.</p>
                    </div>
                    <Button variant="outline" onClick={onCreateLinkInvite}>Gerar link</Button>
                </div>
                {latestInviteLink ? (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                        <p className="font-medium">Ultimo link criado</p>
                        <p className="mt-1 break-all text-muted-foreground">{latestInviteLink}</p>
                    </div>
                ) : null}
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Online</h3>
                        {onlineUsers.length ? onlineUsers.map((connectedUser) => (
                            <div key={connectedUser.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
                                <div>
                                    <p className="font-medium" style={{ color: connectedUser.color }}>{connectedUser.name}</p>
                                    <p className="text-xs text-muted-foreground">Convite direto</p>
                                </div>
                                {hasOpenRoomWithUser(connectedUser.id) || hasPendingDirectInviteWithUser(connectedUser.id)
                                    ? <p className="text-xs text-muted-foreground">Indisponivel</p>
                                    : <Button size="sm" onClick={() => onCreateInvite(connectedUser.id)}>Convidar</Button>}
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Nenhum outro usuario online.</p>}
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pendentes</h3>
                        {directInvites.length ? directInvites.map((invite) => {
                            const isIncoming = invite.targetUserId === currentUser.id
                            return (
                                <div key={invite.id} className="space-y-2 rounded-lg border bg-background p-3">
                                    <p className="text-sm font-medium">
                                        {isIncoming ? `${invite.createdByName} quer abrir um chat privado.` : `Convite enviado para ${invite.targetUserName ?? 'usuario online'}.`}
                                    </p>
                                    {isIncoming ? (
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => onRespondToInvite(invite.id, true)}>Aceitar</Button>
                                            <Button size="sm" variant="outline" onClick={() => onRespondToInvite(invite.id, false)}>Recusar</Button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Aguardando resposta.</p>
                                    )}
                                </div>
                            )
                        }) : <p className="text-sm text-muted-foreground">Sem convites pendentes.</p>}
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Salas</h3>
                        {rooms.length ? rooms.map((room) => {
                            const otherParticipant = room.participants.find((participant) => participant.userId !== currentUser.id)

                            return (
                                <Link
                                    key={room.id}
                                    to={`/chat/private/${room.id}`}
                                    className={cn(
                                        'block rounded-lg border bg-background p-3 transition-colors hover:bg-accent',
                                        activeRoomId === room.id ? 'border-primary' : 'border-border',
                                    )}
                                >
                                    <p className="font-medium" style={{ color: otherParticipant?.color }}>{otherParticipant?.name ?? 'Sala privada'}</p>
                                    <p className="text-xs text-muted-foreground">1:1 privado</p>
                                </Link>
                            )
                        }) : <p className="text-sm text-muted-foreground">Nenhuma sala privada aberta.</p>}
                    </section>
                </div>
            </ScrollArea>
        </aside>
    )
}
