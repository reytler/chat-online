import { Button } from '@/Components/ui/button'
import { ScrollArea } from '@/Components/ui/scroll-area'
import { MessageComposer } from './MessageComposer'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { useEffect, useRef } from 'react'

type PrivateChatViewProps = {
    room: PrivateRoomDTO
    currentUser: UserDTO
    onSendMessage: (content: string) => void
    onMarkRead: () => void
    onTypingChange: (isTyping: boolean) => void
    onDeleteMessage: (messageId: string) => void
    onCloseRoom: () => void
}

function getMessageStatus(room: PrivateRoomDTO, currentUser: UserDTO, message: PrivateRoomDTO['messages'][number]) {
    const recipient = room.participants.find((participant) => participant.userId !== currentUser.id)

    if (!recipient || message.senderId !== currentUser.id) {
        return null
    }

    if (message.readBy.includes(recipient.userId)) {
        return 'Lida'
    }

    if (message.deliveredTo.includes(recipient.userId)) {
        return 'Entregue'
    }

    return 'Enviada'
}

export function PrivateChatView({ room, currentUser, onSendMessage, onMarkRead, onTypingChange, onDeleteMessage, onCloseRoom }: PrivateChatViewProps) {
    const messagesViewportRef = useRef<HTMLDivElement | null>(null)
    const otherParticipant = room.participants.find((participant) => participant.userId !== currentUser.id)
    const typingParticipant = room.participants.find((participant) => participant.userId !== currentUser.id && room.activeTypingUserIds.includes(participant.userId))

    useEffect(() => {
        const viewport = messagesViewportRef.current?.querySelector('[data-slot="scroll-area-viewport"]')

        if (!(viewport instanceof HTMLDivElement)) {
            return
        }

        viewport.scrollTop = viewport.scrollHeight
        onMarkRead()
    }, [onMarkRead, room.messages])

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: otherParticipant?.color }}>{otherParticipant?.name ?? 'Chat privado'}</h2>
                        <p className="text-sm text-muted-foreground">
                            {typingParticipant ? `${typingParticipant.name} esta digitando...` : 'Sala privada 1:1 ativa.'}
                        </p>
                    </div>
                    <Button variant="outline" onClick={onCloseRoom}>Encerrar sala</Button>
                </div>
            </div>

            <ScrollArea className="min-h-0 flex-1" ref={messagesViewportRef}>
                <div className="space-y-3 p-4">
                    {room.messages.map((message) => {
                        const isOwnMessage = message.senderId === currentUser.id
                        const messageStatus = getMessageStatus(room, currentUser, message)

                        return (
                            <div key={message.id} className={`rounded-xl p-3 ${isOwnMessage ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-muted'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium">{message.senderName}</p>
                                        <p className="text-sm opacity-90">{message.deletedAt ? 'Mensagem apagada' : message.content}</p>
                                    </div>
                                    {isOwnMessage && !message.deletedAt ? (
                                        <Button size="sm" variant="ghost" onClick={() => onDeleteMessage(message.id)}>Apagar</Button>
                                    ) : null}
                                </div>
                                {isOwnMessage && messageStatus ? <p className="mt-2 text-right text-xs opacity-80">{messageStatus}</p> : null}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <MessageComposer
                placeholder="Digite sua mensagem privada..."
                onSubmit={onSendMessage}
                onTypingChange={onTypingChange}
            />
        </section>
    )
}
