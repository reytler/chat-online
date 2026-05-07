import { Server, Socket } from 'socket.io'
import { Events } from '@shared/enums/enumEvents'
import { MessageDTO } from '@shared/dtos/MessageDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { PrivateChatStore } from '../stores/PrivateChatStore'
import { PublicMessageStore } from '../stores/PublicMessageStore'
import { UserStore } from '../stores/UserStore'

type SocketDependencies = {
    io: Server
    socket: Socket
    userStore: UserStore
    publicMessageStore: PublicMessageStore
    privateChatStore: PrivateChatStore
}

function emitUserList(io: Server, userStore: UserStore) {
    io.emit(Events.UPDATEUSERLIST, userStore.getAll())
}

function emitPrivateState(socket: Socket, user: UserDTO, privateChatStore: PrivateChatStore, userStore: UserStore) {
    const privateState = privateChatStore.getStateForUser(user.id)

    for (const room of privateState.rooms) {
        privateChatStore.syncParticipants(room.id, userStore.getAll())
        privateChatStore.markMessagesDelivered(room.id, user.id)
        socket.join(room.id)
    }

    socket.emit(Events.PRIVATE_STATE_SYNC, privateChatStore.getStateForUser(user.id))
}

function emitPrivateRoom(io: Server, room: PrivateRoomDTO) {
    io.to(room.id).emit(Events.PRIVATE_ROOM_UPDATED, room)
}

function emitPrivateInvite(socket: Socket, invite: PrivateInviteDTO) {
    socket.emit(Events.PRIVATE_INVITE_RECEIVED, invite)
}

function emitPrivateActionError(socket: Socket, message: string) {
    socket.emit(Events.PRIVATE_ACTION_ERROR, message)
}

export function registerSocketHandlers({ io, socket, userStore, publicMessageStore, privateChatStore }: SocketDependencies) {
    let currentUser: UserDTO | null = null

    socket.on(Events.SENDMESSAGE, (message: MessageDTO) => {
        publicMessageStore.add(message)
        io.emit(Events.NEWMESSAGE, publicMessageStore.getAll())
    })

    socket.on(Events.SETUSER, (user: UserDTO) => {
        const previousUser = userStore.getById(user.id)

        currentUser = user
        userStore.upsert(user)

        socket.emit(Events.NEWMESSAGE, publicMessageStore.getAll())
        emitUserList(io, userStore)
        emitPrivateState(socket, user, privateChatStore, userStore)

        if (!previousUser) {
            socket.broadcast.emit(Events.NEWUSER, user)
        }
    })

    socket.on(Events.REMOVEUSER, () => {
        if (!currentUser) {
            return
        }

        userStore.removeById(currentUser.id)
        socket.broadcast.emit(Events.OFFUSER, currentUser)
        emitUserList(io, userStore)
        currentUser = null
    })

    socket.on(Events.CREATE_PRIVATE_INVITE, ({ targetUserId }: { targetUserId: string }) => {
        if (!currentUser) {
            emitPrivateActionError(socket, 'Voce precisa estar conectado para convidar outro usuario.')
            return
        }

        if (currentUser.id === targetUserId) {
            emitPrivateActionError(socket, 'Voce nao pode criar um convite privado para si mesmo.')
            return
        }

        const targetUser = userStore.getById(targetUserId)

        if (!targetUser) {
            emitPrivateActionError(socket, 'O usuario selecionado nao esta mais online.')
            return
        }

        if (privateChatStore.hasPendingDirectInviteBetween(currentUser.id, targetUserId)) {
            emitPrivateActionError(socket, 'Ja existe um convite privado pendente entre esses usuarios.')
            return
        }

        const invite = privateChatStore.createDirectInvite(currentUser, targetUser)
        const targetSocket = io.sockets.sockets.get(targetUser.idConnection)

        socket.emit(Events.PRIVATE_STATE_SYNC, privateChatStore.getStateForUser(currentUser.id))

        if (targetSocket) {
            emitPrivateInvite(targetSocket, invite)
            emitPrivateState(targetSocket, targetUser, privateChatStore, userStore)
        }
    })

    socket.on(Events.CREATE_PRIVATE_LINK_INVITE, () => {
        if (!currentUser) {
            emitPrivateActionError(socket, 'Voce precisa estar conectado para gerar um link privado.')
            return
        }

        const invite = privateChatStore.createLinkInvite(currentUser)
        socket.emit(Events.PRIVATE_LINK_CREATED, invite)
        emitPrivateState(socket, currentUser, privateChatStore, userStore)
    })

    socket.on(Events.RESPOND_PRIVATE_INVITE, ({ inviteId, accepted }: { inviteId: string, accepted: boolean }) => {
        if (!currentUser) {
            emitPrivateActionError(socket, 'Voce precisa estar conectado para responder um convite.')
            return
        }

        const invite = privateChatStore.getInviteById(inviteId)

        if (!invite || invite.type !== 'direct' || invite.status !== 'pending' || invite.targetUserId !== currentUser.id) {
            emitPrivateActionError(socket, 'O convite informado nao esta mais disponivel.')
            return
        }

        const creator = userStore.getById(invite.createdByUserId)

        if (!creator) {
            privateChatStore.markInviteStatus(invite.id, 'rejected')
            emitPrivateState(socket, currentUser, privateChatStore, userStore)
            emitPrivateActionError(socket, 'O usuario que criou o convite nao esta mais online.')
            return
        }

        if (!accepted) {
            privateChatStore.markInviteStatus(invite.id, 'rejected')
            emitPrivateState(socket, currentUser, privateChatStore, userStore)
            const creatorSocket = io.sockets.sockets.get(creator.idConnection)
            if (creatorSocket) {
                emitPrivateState(creatorSocket, creator, privateChatStore, userStore)
            }
            return
        }

        privateChatStore.markInviteStatus(invite.id, 'accepted')
        const room = privateChatStore.createRoom([creator, currentUser])

        const creatorSocket = io.sockets.sockets.get(creator.idConnection)
        socket.join(room.id)
        creatorSocket?.join(room.id)

        emitPrivateRoom(io, room)
        socket.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })
        creatorSocket?.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })

        emitPrivateState(socket, currentUser, privateChatStore, userStore)
        if (creatorSocket) {
            emitPrivateState(creatorSocket, creator, privateChatStore, userStore)
        }
    })

    socket.on(Events.JOIN_PRIVATE_ROOM_BY_LINK, ({ token }: { token: string }) => {
        if (!currentUser) {
            emitPrivateActionError(socket, 'Voce precisa estar conectado para entrar pelo link.')
            return
        }

        const invite = privateChatStore.getInviteByToken(token)

        if (!invite || invite.type !== 'link' || invite.status !== 'pending') {
            emitPrivateActionError(socket, 'Esse link nao esta mais disponivel.')
            return
        }

        if (invite.createdByUserId === currentUser.id) {
            emitPrivateActionError(socket, 'Voce nao pode usar um link criado por voce mesmo.')
            return
        }

        const creator = userStore.getById(invite.createdByUserId)

        if (!creator) {
            privateChatStore.markInviteStatus(invite.id, 'used')
            emitPrivateActionError(socket, 'O usuario que criou o link nao esta mais online.')
            return
        }

        privateChatStore.markInviteStatus(invite.id, 'used')
        const room = privateChatStore.createRoom([creator, currentUser])
        const creatorSocket = io.sockets.sockets.get(creator.idConnection)

        socket.join(room.id)
        creatorSocket?.join(room.id)

        emitPrivateRoom(io, room)
        socket.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })
        creatorSocket?.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: false })

        emitPrivateState(socket, currentUser, privateChatStore, userStore)
        if (creatorSocket) {
            emitPrivateState(creatorSocket, creator, privateChatStore, userStore)
        }
    })

    socket.on(Events.SEND_PRIVATE_MESSAGE, ({ roomId, content }: { roomId: string, content: string }) => {
        if (!currentUser) {
            emitPrivateActionError(socket, 'Voce precisa estar conectado para enviar mensagem privada.')
            return
        }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            emitPrivateActionError(socket, 'Sala privada invalida.')
            return
        }

        const updatedRoom = privateChatStore.addMessage(roomId, authenticatedUser, content.trim())

        if (!updatedRoom) {
            return
        }

        for (const participant of updatedRoom.participants) {
            if (participant.userId === authenticatedUser.id) {
                continue
            }

            const participantSocket = io.sockets.sockets.get(participant.idConnection)
            if (participantSocket) {
                privateChatStore.markMessagesDelivered(roomId, participant.userId)
            }
        }

        const deliveredRoom = privateChatStore.getRoomById(roomId)
        if (deliveredRoom) {
            emitPrivateRoom(io, deliveredRoom)
        }
    })

    socket.on(Events.SET_PRIVATE_TYPING, ({ roomId, isTyping }: { roomId: string, isTyping: boolean }) => {
        if (!currentUser) {
            return
        }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            return
        }

        const updatedRoom = privateChatStore.setTyping(roomId, authenticatedUser.id, isTyping)

        if (updatedRoom) {
            io.to(roomId).emit(Events.PRIVATE_TYPING_UPDATED, {
                roomId,
                activeTypingUserIds: updatedRoom.activeTypingUserIds,
            })
        }
    })

    socket.on(Events.MARK_PRIVATE_ROOM_READ, ({ roomId }: { roomId: string }) => {
        if (!currentUser) {
            return
        }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            return
        }

        const updatedRoom = privateChatStore.markRoomRead(roomId, authenticatedUser.id)

        if (updatedRoom) {
            emitPrivateRoom(io, updatedRoom)
        }
    })

    socket.on(Events.DELETE_PRIVATE_MESSAGE, ({ roomId, messageId }: { roomId: string, messageId: string }) => {
        if (!currentUser) {
            return
        }

        const updatedRoom = privateChatStore.deleteMessage(roomId, messageId, currentUser.id)

        if (updatedRoom) {
            emitPrivateRoom(io, updatedRoom)
        }
    })

    socket.on('disconnect', () => {
        if (!currentUser) {
            return
        }

        userStore.removeById(currentUser.id)
        socket.broadcast.emit(Events.OFFUSER, currentUser)
        emitUserList(io, userStore)
        currentUser = null
    })
}
