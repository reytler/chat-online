import { MessageDTO } from '@shared/dtos/MessageDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { ScrollArea } from '@/Components/ui/scroll-area'
import { useEffect, useRef } from 'react'
import { MessageComposer } from './MessageComposer'

type PublicChatViewProps = {
    user: UserDTO
    messages: MessageDTO[]
    connectedUsers: UserDTO[]
    onSendMessage: (content: string) => boolean
}

export function PublicChatView({ user, messages, connectedUsers, onSendMessage }: PublicChatViewProps) {
    const messagesViewportRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const viewport = messagesViewportRef.current?.querySelector('[data-slot="scroll-area-viewport"]')

        if (!(viewport instanceof HTMLDivElement)) {
            return
        }

        viewport.scrollTop = viewport.scrollHeight
    }, [messages])

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b p-4">
                <h2 className="text-lg font-semibold">Sala publica</h2>
                <p className="text-sm text-muted-foreground">Conectado como {user.name}.</p>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-4" ref={messagesViewportRef}>
                <div className="space-y-3">
                    {messages.map((message, index) => (
                        <div key={`${message.idConnection}-${index}-${message.content}`} className="rounded-xl bg-muted p-3">
                            <strong style={{ color: connectedUsers.find((connectedUser) => connectedUser.idConnection === message.idConnection)?.color }}>
                                {message.userName}:
                            </strong>{' '}
                            {message.content}
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <MessageComposer placeholder="Digite sua mensagem publica..." onSubmit={onSendMessage} />
        </section>
    )
}
