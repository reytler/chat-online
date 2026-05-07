import { randomUUID } from 'node:crypto'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateMessageDTO } from '@shared/dtos/PrivateMessageDTO'
import { PrivateParticipantDTO } from '@shared/dtos/PrivateParticipantDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { PrivateStateDTO } from '@shared/dtos/PrivateStateDTO'
import { UserDTO } from '@shared/dtos/UserDTO'

type PrivateRoomRecord = PrivateRoomDTO

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function toParticipant(user: UserDTO): PrivateParticipantDTO {
    return {
        userId: user.id,
        name: user.name,
        color: user.color,
        idConnection: user.idConnection,
    }
}

export class PrivateChatStore {
    private rooms = new Map<string, PrivateRoomRecord>()
    private invites = new Map<string, PrivateInviteDTO>()

    private findRoomBetweenUsers(userId: string, targetUserId: string) {
        return [...this.rooms.values()].find((room) => {
            if (room.participants.length !== 2) {
                return false
            }

            const participantIds = room.participants.map((participant) => participant.userId)

            return participantIds.includes(userId) && participantIds.includes(targetUserId)
        })
    }

    public getStateForUser(userId: string): PrivateStateDTO {
        const rooms = [...this.rooms.values()].filter((room) => room.lifecycle === 'open' && room.participants.some((participant) => participant.userId === userId))
        const invites = [...this.invites.values()].filter((invite) => {
            if (invite.status !== 'pending') {
                return false
            }

            return invite.createdByUserId === userId || invite.targetUserId === userId
        })

        return clone({ rooms, invites })
    }

    public createDirectInvite(createdBy: UserDTO, targetUser: UserDTO) {
        const invite: PrivateInviteDTO = {
            id: randomUUID(),
            type: 'direct',
            status: 'pending',
            createdByUserId: createdBy.id,
            createdByName: createdBy.name,
            targetUserId: targetUser.id,
            targetUserName: targetUser.name,
            token: null,
            createdAt: new Date().toISOString(),
        }

        this.invites.set(invite.id, invite)

        return clone(invite)
    }

    public createLinkInvite(createdBy: UserDTO) {
        const invite: PrivateInviteDTO = {
            id: randomUUID(),
            type: 'link',
            status: 'pending',
            createdByUserId: createdBy.id,
            createdByName: createdBy.name,
            targetUserId: null,
            targetUserName: null,
            token: randomUUID(),
            createdAt: new Date().toISOString(),
        }

        this.invites.set(invite.id, invite)

        return clone(invite)
    }

    public getInviteById(inviteId: string) {
        const invite = this.invites.get(inviteId)

        return invite ? clone(invite) : null
    }

    public getInviteByToken(token: string) {
        const invite = [...this.invites.values()].find((currentInvite) => currentInvite.token === token)

        return invite ? clone(invite) : null
    }

    public hasPendingDirectInviteBetween(userId: string, targetUserId: string) {
        return [...this.invites.values()].some((invite) => {
            if (invite.type !== 'direct' || invite.status !== 'pending' || !invite.targetUserId) {
                return false
            }

            const sameDirection = invite.createdByUserId === userId && invite.targetUserId === targetUserId
            const oppositeDirection = invite.createdByUserId === targetUserId && invite.targetUserId === userId

            return sameDirection || oppositeDirection
        })
    }

    public markInviteStatus(inviteId: string, status: PrivateInviteDTO['status']) {
        const invite = this.invites.get(inviteId)

        if (!invite) {
            return null
        }

        invite.status = status

        return clone(invite)
    }

    public createRoom(participants: UserDTO[]) {
        const existingRoom = this.findRoomBetweenUsers(participants[0].id, participants[1].id)

        if (existingRoom) {
            existingRoom.lifecycle = 'open'
            existingRoom.closedAt = null
            existingRoom.activeTypingUserIds = []
            existingRoom.participants = participants.map(toParticipant)

            return clone(existingRoom)
        }

        const room: PrivateRoomRecord = {
            id: randomUUID(),
            participants: participants.map(toParticipant),
            messages: [],
            createdAt: new Date().toISOString(),
            lifecycle: 'open',
            closedAt: null,
            activeTypingUserIds: [],
        }

        this.rooms.set(room.id, room)

        return clone(room)
    }

    public getRoomById(roomId: string) {
        const room = this.rooms.get(roomId)

        return room ? clone(room) : null
    }

    public hasOpenRoomBetween(userId: string, targetUserId: string) {
        const room = this.findRoomBetweenUsers(userId, targetUserId)

        return room?.lifecycle === 'open'
    }

    public syncParticipants(roomId: string, users: UserDTO[]) {
        const room = this.rooms.get(roomId)

        if (!room) {
            return null
        }

        room.participants = room.participants.map((participant) => {
            const connectedUser = users.find((user) => user.id === participant.userId)

            return connectedUser ? toParticipant(connectedUser) : participant
        })

        return clone(room)
    }

    public markMessagesDelivered(roomId: string, userId: string) {
        const room = this.rooms.get(roomId)

        if (!room) {
            return null
        }

        for (const message of room.messages) {
            if (message.senderId === userId || message.deliveredTo.includes(userId)) {
                continue
            }

            message.deliveredTo.push(userId)
        }

        return clone(room)
    }

    public markRoomRead(roomId: string, userId: string) {
        const room = this.rooms.get(roomId)

        if (!room) {
            return null
        }

        for (const message of room.messages) {
            if (message.senderId === userId || message.readBy.includes(userId)) {
                continue
            }

            message.readBy.push(userId)
        }

        return clone(room)
    }

    public addMessage(roomId: string, sender: UserDTO, content: string) {
        const room = this.rooms.get(roomId)

        if (!room || room.lifecycle !== 'open') {
            return null
        }

        const message: PrivateMessageDTO = {
            id: randomUUID(),
            roomId,
            senderId: sender.id,
            senderConnectionId: sender.idConnection,
            senderName: sender.name,
            content,
            createdAt: new Date().toISOString(),
            deletedAt: null,
            deliveredTo: [sender.id],
            readBy: [sender.id],
        }

        room.messages.push(message)
        room.activeTypingUserIds = room.activeTypingUserIds.filter((currentUserId) => currentUserId !== sender.id)

        return clone(room)
    }

    public setTyping(roomId: string, userId: string, isTyping: boolean) {
        const room = this.rooms.get(roomId)

        if (!room || room.lifecycle !== 'open') {
            return null
        }

        room.activeTypingUserIds = isTyping
            ? [...new Set([...room.activeTypingUserIds, userId])]
            : room.activeTypingUserIds.filter((currentUserId) => currentUserId !== userId)

        return clone(room)
    }

    public deleteMessage(roomId: string, messageId: string, userId: string) {
        const room = this.rooms.get(roomId)

        if (!room) {
            return null
        }

        const message = room.messages.find((currentMessage) => currentMessage.id === messageId)

        if (!message || message.senderId !== userId || message.deletedAt) {
            return null
        }

        message.content = ''
        message.deletedAt = new Date().toISOString()

        return clone(room)
    }

    public closeRoom(roomId: string, userId: string) {
        const room = this.rooms.get(roomId)

        if (!room || room.lifecycle !== 'open' || !room.participants.some((participant) => participant.userId === userId)) {
            return null
        }

        room.lifecycle = 'closed'
        room.closedAt = new Date().toISOString()
        room.activeTypingUserIds = []

        return clone(room)
    }
}
