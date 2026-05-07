import { PrivateMessageDTO } from './PrivateMessageDTO'
import { PrivateParticipantDTO } from './PrivateParticipantDTO'

export type PrivateRoomDTO = {
    id: string
    participants: PrivateParticipantDTO[]
    messages: PrivateMessageDTO[]
    createdAt: string
    lifecycle: 'open' | 'closed'
    closedAt: string | null
    activeTypingUserIds: string[]
}
