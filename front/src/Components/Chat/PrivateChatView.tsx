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
    const lastMessageIdRef = useRef<string | null>(null)
    const messageCountRef = useRef(0)
    const otherParticipant = room.participants.find((participant) => participant.userId !== currentUser.id)
    const typingParticipant = room.participants.find((participant) => participant.userId !== currentUser.id && room.activeTypingUserIds.includes(participant.userId))
    const hasUnreadMessages = room.messages.some((message) => message.senderId !== currentUser.id && !message.readBy.includes(currentUser.id))

    useEffect(() => {
        const viewport = messagesViewportRef.current?.querySelector('[data-slot="scroll-area-viewport"]')
        const lastMessage = room.messages.at(-1) ?? null

        if (!(viewport instanceof HTMLDivElement)) {
            return
        }

        if (lastMessageIdRef.current === lastMessage?.id && messageCountRef.current === room.messages.length) {
            return
        }

        viewport.scrollTop = viewport.scrollHeight
        lastMessageIdRef.current = lastMessage?.id ?? null
        messageCountRef.current = room.messages.length
    }, [room.messages])

    useEffect(() => {
        if (!hasUnreadMessages) {
            return
        }

        onMarkRead()
    }, [currentUser.id, hasUnreadMessages, onMarkRead])

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: otherParticipant?.color }}>{otherParticipant?.name ?? 'Chat privado'}</h2>
                        <p className="text-sm text-muted-foreground">Sala privada 1:1 ativa.</p>
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
                            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                <div className={`w-full max-w-[85%] rounded-xl p-3 sm:max-w-[75%] ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                        <p className="font-medium">{message.senderName}</p>
                                            <p className="text-sm opacity-90 break-words whitespace-pre-wrap">{message.deletedAt ? 'Mensagem apagada' : message.content}</p>
                                        </div>
                                        {isOwnMessage && !message.deletedAt ? (
                                            <Button size="sm" variant="ghost" className="shrink-0 self-start" onClick={() => onDeleteMessage(message.id)}>Apagar</Button>
                                        ) : null}
                                    </div>
                                    {isOwnMessage && messageStatus ? <p className="mt-2 text-right text-xs opacity-80">{messageStatus}</p> : null}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <div className="min-h-6 px-4 py-1 text-sm text-muted-foreground">
                {typingParticipant ? `${typingParticipant.name} esta digitando...` : null}
            </div>

            <MessageComposer
                placeholder="Digite sua mensagem privada..."
                onSubmit={onSendMessage}
                onTypingChange={onTypingChange}
            />
        </section>
    )
}
