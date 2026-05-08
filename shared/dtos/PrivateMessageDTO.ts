import { ObservabilityMetaDTO } from './ObservabilityMetaDTO'

export type PrivateMessageDTO = {
    id: string
    roomId: string
    senderId: string
    senderConnectionId: string
    senderName: string
    content: string
    createdAt: string
    deletedAt: string | null
    deliveredTo: string[]
    readBy: string[]
    meta?: ObservabilityMetaDTO
}
