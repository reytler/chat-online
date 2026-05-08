import { Server, Socket } from 'socket.io'
import { Events } from '@shared/enums/enumEvents'
import { MessageDTO } from '@shared/dtos/MessageDTO'
import { ObservabilityMetaDTO } from '@shared/dtos/ObservabilityMetaDTO'
import { UserDTO } from '@shared/dtos/UserDTO'
import { PrivateInviteDTO } from '@shared/dtos/PrivateInviteDTO'
import { PrivateRoomDTO } from '@shared/dtos/PrivateRoomDTO'
import { createObservableSocketHandler } from './createObservableSocketHandler'
import { ObservabilityService } from '../observability/ObservabilityService'
import { PrivateChatStore } from '../stores/PrivateChatStore'
import { PublicMessageStore } from '../stores/PublicMessageStore'
import { UserStore } from '../stores/UserStore'

type SocketDependencies = {
    io: Server
    socket: Socket
    userStore: UserStore
    publicMessageStore: PublicMessageStore
    privateChatStore: PrivateChatStore
    observability: ObservabilityService
}

type ObservablePrivatePayload = {
    meta?: ObservabilityMetaDTO
}

type PrivateActionErrorPayload = {
    message: string
    meta?: ObservabilityMetaDTO
}

type CreatePrivateInvitePayload = ObservablePrivatePayload & {
    targetUserId: string
}

type RespondPrivateInvitePayload = ObservablePrivatePayload & {
    inviteId: string
    accepted: boolean
}

type JoinPrivateRoomByLinkPayload = ObservablePrivatePayload & {
    token: string
}

type ClosePrivateRoomPayload = ObservablePrivatePayload & {
    roomId: string
}

type SendPrivateMessagePayload = ObservablePrivatePayload & {
    roomId: string
    content: string
}

type SetPrivateTypingPayload = ObservablePrivatePayload & {
    roomId: string
    isTyping: boolean
}

type MarkPrivateRoomReadPayload = ObservablePrivatePayload & {
    roomId: string
}

type DeletePrivateMessagePayload = ObservablePrivatePayload & {
    roomId: string
    messageId: string
}

function emitUserList(io: Server, userStore: UserStore) {
    io.emit(Events.UPDATEUSERLIST, userStore.getAll())
}

function getMessageObservabilityId(meta?: ObservabilityMetaDTO) {
    return meta?.interactionId ?? meta?.correlationId
}

function joinObservedRoom(io: Server, socket: Socket, roomId: string, user: UserDTO, observability: ObservabilityService, reason: string) {
    if (socket.rooms.has(roomId)) {
        return
    }

    socket.join(roomId)

    observability.increment('socket.room.joined_total', 1, {
        roomId,
        reason,
        source: 'api',
    })
    observability.info('socket.room.joined', {
        socketId: socket.id,
        userId: user.id,
        userName: user.name,
        roomId,
        reason,
        source: 'api',
        totalUsersInRoom: io.sockets.adapter.rooms.get(roomId)?.size ?? 0,
    })
}

function leaveObservedRoom(io: Server, socket: Socket, roomId: string, user: UserDTO, observability: ObservabilityService, reason: string) {
    if (!socket.rooms.has(roomId)) {
        return
    }

    socket.leave(roomId)

    observability.increment('socket.room.left_total', 1, {
        roomId,
        reason,
        source: 'api',
    })
    observability.info('socket.room.left', {
        socketId: socket.id,
        userId: user.id,
        userName: user.name,
        roomId,
        reason,
        source: 'api',
        totalUsersInRoom: io.sockets.adapter.rooms.get(roomId)?.size ?? 0,
    })
}

function emitPrivateState(io: Server, socket: Socket, user: UserDTO, privateChatStore: PrivateChatStore, userStore: UserStore, observability: ObservabilityService, reason: string) {
    const privateState = privateChatStore.getStateForUser(user.id)

    for (const room of privateState.rooms) {
        privateChatStore.syncParticipants(room.id, userStore.getAll())
        privateChatStore.markMessagesDelivered(room.id, user.id)
        joinObservedRoom(io, socket, room.id, user, observability, reason)
    }

    socket.emit(Events.PRIVATE_STATE_SYNC, privateChatStore.getStateForUser(user.id))
}

function emitPrivateRoom(io: Server, room: PrivateRoomDTO) {
    io.to(room.id).emit(Events.PRIVATE_ROOM_UPDATED, room)
}

function emitPrivateRoomClosed(io: Server, room: PrivateRoomDTO) {
    io.to(room.id).emit(Events.PRIVATE_ROOM_CLOSED, room)
}

function emitPrivateInvite(socket: Socket, invite: PrivateInviteDTO) {
    socket.emit(Events.PRIVATE_INVITE_RECEIVED, invite)
}

function emitPrivateActionError(socket: Socket, message: string, observability: ObservabilityService, context?: Record<string, string | number | boolean | null | undefined>, meta?: ObservabilityMetaDTO) {
    observability.warn('chat.private.action_rejected', {
        socketId: socket.id,
        ...context,
        reason: message,
    })
    socket.emit(Events.PRIVATE_ACTION_ERROR, { message, meta } satisfies PrivateActionErrorPayload)
}

function getSocketContext(socket: Socket, currentUser: UserDTO | null, context?: Record<string, string | number | boolean | null | undefined>) {
    return {
        socketId: socket.id,
        userId: currentUser?.id,
        userName: currentUser?.name,
        ...context,
    }
}

export function registerSocketHandlers({ io, socket, userStore, publicMessageStore, privateChatStore, observability }: SocketDependencies) {
    let currentUser: UserDTO | null = null
    const connectedAt = Date.now()

    socket.on(Events.SENDMESSAGE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.SENDMESSAGE,
        getContext: (message: MessageDTO) => ({
            messageLength: message.content.trim().length,
        }),
        handler: (message: MessageDTO) => {
            const messageStartedAt = Date.now()
            const messageId = getMessageObservabilityId(message.meta)

            observability.increment('chat.messages.received.total', 1, { channel: 'public', source: 'api' })
            observability.info('chat.message.received', {
                ...getSocketContext(socket, currentUser),
                channel: 'public',
                correlationId: message.meta?.correlationId,
                interactionId: message.meta?.interactionId,
                messageId,
                roomId: 'public',
                messageLength: message.content.trim().length,
            })

            publicMessageStore.add(message)
            const persistenceDurationMs = Date.now() - messageStartedAt

            observability.timing('chat.message.persistence.duration_ms', persistenceDurationMs, { channel: 'public', source: 'api' })
            observability.info('chat.message.persisted', {
                ...getSocketContext(socket, currentUser),
                channel: 'public',
                correlationId: message.meta?.correlationId,
                interactionId: message.meta?.interactionId,
                messageId,
                roomId: 'public',
                persistenceDurationMs,
                repository: 'PublicMessageStore',
                status: 'success',
            })

            const broadcastStartedAt = Date.now()
            io.emit(Events.NEWMESSAGE, publicMessageStore.getAll())
            const broadcastDurationMs = Date.now() - broadcastStartedAt

            observability.increment('chat.messages.sent.total', 1, { channel: 'public', source: 'api' })
            observability.timing('chat.message.broadcast.duration_ms', broadcastDurationMs, { channel: 'public', source: 'api' })
            observability.timing('chat.message.processing.duration_ms', Date.now() - messageStartedAt, { channel: 'public', source: 'api' })
            observability.info('chat.message.broadcasted', {
                ...getSocketContext(socket, currentUser),
                channel: 'public',
                correlationId: message.meta?.correlationId,
                interactionId: message.meta?.interactionId,
                messageId,
                roomId: 'public',
                broadcastDurationMs,
                recipientCount: io.sockets.sockets.size,
                status: 'success',
            })

            observability.info('chat.public.message_sent', {
                ...getSocketContext(socket, currentUser),
                correlationId: message.meta?.correlationId,
                messageLength: message.content.trim().length,
                totalMessages: publicMessageStore.count(),
            })
        },
    }))

    socket.on(Events.SETUSER, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.SETUSER,
        getContext: (user: UserDTO) => ({
            userId: user.id,
            connectionId: user.idConnection,
        }),
        handler: (user: UserDTO) => {
            const previousUser = userStore.getById(user.id)

            currentUser = user
            userStore.upsert(user)

            socket.emit(Events.NEWMESSAGE, publicMessageStore.getAll())
            emitUserList(io, userStore)
            emitPrivateState(io, socket, user, privateChatStore, userStore, observability, previousUser ? 'session_resync' : 'session_join')

            if (!previousUser) {
                socket.broadcast.emit(Events.NEWUSER, user)
            }
            observability.info('chat.session.user_registered', {
                ...getSocketContext(socket, currentUser),
                isReconnect: Boolean(previousUser),
                activeUsers: userStore.count(),
            })
        },
    }))

    socket.on(Events.REMOVEUSER, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.REMOVEUSER,
        handler: () => {
            if (!currentUser) {
                return
            }

            for (const room of privateChatStore.getStateForUser(currentUser.id).rooms) {
                leaveObservedRoom(io, socket, room.id, currentUser, observability, 'logout')
            }

            userStore.removeById(currentUser.id)
            socket.broadcast.emit(Events.OFFUSER, currentUser)
            emitUserList(io, userStore)
            observability.info('chat.session.user_removed', {
                ...getSocketContext(socket, currentUser),
                activeUsers: userStore.count(),
            })
        currentUser = null
        },
    }))

    socket.on(Events.CREATE_PRIVATE_INVITE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.CREATE_PRIVATE_INVITE,
        getContext: ({ targetUserId }: CreatePrivateInvitePayload) => ({ targetUserId }),
        handler: ({ targetUserId, meta }: CreatePrivateInvitePayload) => {
            if (!currentUser) {
                emitPrivateActionError(socket, 'Voce precisa estar conectado para convidar outro usuario.', observability, undefined, meta)
                return
            }

        if (currentUser.id === targetUserId) {
            emitPrivateActionError(socket, 'Voce nao pode criar um convite privado para si mesmo.', observability, getSocketContext(socket, currentUser, { targetUserId }), meta)
            return
        }

        const targetUser = userStore.getById(targetUserId)

        if (!targetUser) {
            emitPrivateActionError(socket, 'O usuario selecionado nao esta mais online.', observability, getSocketContext(socket, currentUser, { targetUserId }), meta)
            return
        }

        if (privateChatStore.hasPendingDirectInviteBetween(currentUser.id, targetUserId)) {
            emitPrivateActionError(socket, 'Ja existe um convite privado pendente entre esses usuarios.', observability, getSocketContext(socket, currentUser, { targetUserId }), meta)
            return
        }

        if (privateChatStore.hasOpenRoomBetween(currentUser.id, targetUserId)) {
            emitPrivateActionError(socket, 'Ja existe uma sala privada aberta entre esses usuarios.', observability, getSocketContext(socket, currentUser, { targetUserId }), meta)
            return
        }

        const invite = privateChatStore.createDirectInvite(currentUser, targetUser)
        const targetSocket = io.sockets.sockets.get(targetUser.idConnection)

        socket.emit(Events.PRIVATE_STATE_SYNC, privateChatStore.getStateForUser(currentUser.id))

        if (targetSocket) {
            emitPrivateInvite(targetSocket, invite)
            emitPrivateState(io, targetSocket, targetUser, privateChatStore, userStore, observability, 'invite_received_sync')
        }
            observability.info('chat.private.invite_created', {
                ...getSocketContext(socket, currentUser),
                targetUserId,
                inviteId: invite.id,
            })
        },
    }))

    socket.on(Events.CREATE_PRIVATE_LINK_INVITE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.CREATE_PRIVATE_LINK_INVITE,
        handler: ({ meta }: ObservablePrivatePayload = {}) => {
            if (!currentUser) {
                emitPrivateActionError(socket, 'Voce precisa estar conectado para gerar um link privado.', observability, undefined, meta)
                return
            }

            const invite = privateChatStore.createLinkInvite(currentUser)
            socket.emit(Events.PRIVATE_LINK_CREATED, invite)
            emitPrivateState(io, socket, currentUser, privateChatStore, userStore, observability, 'link_invite_created_sync')
            observability.info('chat.private.link_invite_created', {
                ...getSocketContext(socket, currentUser),
                inviteId: invite.id,
            })
        },
    }))

    socket.on(Events.RESPOND_PRIVATE_INVITE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.RESPOND_PRIVATE_INVITE,
        getContext: ({ inviteId, accepted }: RespondPrivateInvitePayload) => ({ inviteId, accepted }),
        handler: ({ inviteId, accepted, meta }: RespondPrivateInvitePayload) => {
            if (!currentUser) {
                emitPrivateActionError(socket, 'Voce precisa estar conectado para responder um convite.', observability, undefined, meta)
                return
            }

        const invite = privateChatStore.getInviteById(inviteId)

        if (!invite || invite.type !== 'direct' || invite.status !== 'pending' || invite.targetUserId !== currentUser.id) {
            emitPrivateActionError(socket, 'O convite informado nao esta mais disponivel.', observability, getSocketContext(socket, currentUser, { inviteId }), meta)
            return
        }

        const creator = userStore.getById(invite.createdByUserId)

        if (!creator) {
            privateChatStore.markInviteStatus(invite.id, 'rejected')
            emitPrivateState(io, socket, currentUser, privateChatStore, userStore, observability, 'invite_creator_missing_sync')
            emitPrivateActionError(socket, 'O usuario que criou o convite nao esta mais online.', observability, getSocketContext(socket, currentUser, { inviteId }), meta)
            return
        }

        if (!accepted) {
            privateChatStore.markInviteStatus(invite.id, 'rejected')
            emitPrivateState(io, socket, currentUser, privateChatStore, userStore, observability, 'invite_rejected_sync')
            const creatorSocket = io.sockets.sockets.get(creator.idConnection)
            if (creatorSocket) {
                emitPrivateState(io, creatorSocket, creator, privateChatStore, userStore, observability, 'invite_rejected_sync')
            }
                observability.info('chat.private.invite_rejected', {
                    ...getSocketContext(socket, currentUser),
                    inviteId,
                })
            return
        }

        privateChatStore.markInviteStatus(invite.id, 'accepted')
        const room = privateChatStore.createRoom([creator, currentUser])

        const creatorSocket = io.sockets.sockets.get(creator.idConnection)
        joinObservedRoom(io, socket, room.id, currentUser, observability, 'invite_accepted')
        if (creatorSocket) {
            joinObservedRoom(io, creatorSocket, room.id, creator, observability, 'invite_accepted')
        }

        emitPrivateRoom(io, room)
        socket.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })
        creatorSocket?.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })

        emitPrivateState(io, socket, currentUser, privateChatStore, userStore, observability, 'room_opened_sync')
        if (creatorSocket) {
            emitPrivateState(io, creatorSocket, creator, privateChatStore, userStore, observability, 'room_opened_sync')
        }
            observability.info('chat.private.room_opened_from_invite', {
                ...getSocketContext(socket, currentUser),
                inviteId,
                roomId: room.id,
            })
        },
    }))

    socket.on(Events.JOIN_PRIVATE_ROOM_BY_LINK, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.JOIN_PRIVATE_ROOM_BY_LINK,
        getContext: ({ token }: JoinPrivateRoomByLinkPayload) => ({ tokenLength: token.length }),
        handler: ({ token, meta }: JoinPrivateRoomByLinkPayload) => {
            if (!currentUser) {
                emitPrivateActionError(socket, 'Voce precisa estar conectado para entrar pelo link.', observability, undefined, meta)
                return
            }

        const invite = privateChatStore.getInviteByToken(token)

        if (!invite || invite.type !== 'link' || invite.status !== 'pending') {
            emitPrivateActionError(socket, 'Esse link nao esta mais disponivel.', observability, getSocketContext(socket, currentUser), meta)
            return
        }

        if (invite.createdByUserId === currentUser.id) {
            emitPrivateActionError(socket, 'Voce nao pode usar um link criado por voce mesmo.', observability, getSocketContext(socket, currentUser), meta)
            return
        }

        const creator = userStore.getById(invite.createdByUserId)

        if (!creator) {
            privateChatStore.markInviteStatus(invite.id, 'used')
            emitPrivateActionError(socket, 'O usuario que criou o link nao esta mais online.', observability, getSocketContext(socket, currentUser, { inviteId: invite.id }), meta)
            return
        }

        privateChatStore.markInviteStatus(invite.id, 'used')
        const room = privateChatStore.createRoom([creator, currentUser])
        const creatorSocket = io.sockets.sockets.get(creator.idConnection)

        joinObservedRoom(io, socket, room.id, currentUser, observability, 'link_joined')
        if (creatorSocket) {
            joinObservedRoom(io, creatorSocket, room.id, creator, observability, 'link_joined')
        }

        emitPrivateRoom(io, room)
        socket.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: true })
        creatorSocket?.emit(Events.PRIVATE_ROOM_OPENED, { room, shouldNavigate: false })

        emitPrivateState(io, socket, currentUser, privateChatStore, userStore, observability, 'room_opened_sync')
        if (creatorSocket) {
            emitPrivateState(io, creatorSocket, creator, privateChatStore, userStore, observability, 'room_opened_sync')
        }
            observability.info('chat.private.room_opened_from_link', {
                ...getSocketContext(socket, currentUser),
                inviteId: invite.id,
                roomId: room.id,
            })
        },
    }))

    socket.on(Events.CLOSE_PRIVATE_ROOM, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.CLOSE_PRIVATE_ROOM,
        getContext: ({ roomId }: ClosePrivateRoomPayload) => ({ roomId }),
        handler: ({ roomId, meta }: ClosePrivateRoomPayload) => {
            if (!currentUser) {
                emitPrivateActionError(socket, 'Voce precisa estar conectado para encerrar a sala privada.', observability, undefined, meta)
                return
            }

        const room = privateChatStore.closeRoom(roomId, currentUser.id)

        if (!room) {
            emitPrivateActionError(socket, 'Sala privada invalida ou ja encerrada.', observability, getSocketContext(socket, currentUser, { roomId }), meta)
            return
        }

        emitPrivateRoomClosed(io, room)

        for (const participant of room.participants) {
            const participantSocket = io.sockets.sockets.get(participant.idConnection)
            const participantUser = userStore.getById(participant.userId)

            if (participantSocket) {
                leaveObservedRoom(io, participantSocket, room.id, participantUser ?? currentUser, observability, 'room_closed')
            }

            if (participantSocket && participantUser) {
                emitPrivateState(io, participantSocket, participantUser, privateChatStore, userStore, observability, 'room_closed_sync')
            }
        }
            observability.info('chat.private.room_closed', {
                ...getSocketContext(socket, currentUser),
                roomId,
                openRooms: privateChatStore.countOpenRooms(),
            })
        },
    }))

    socket.on(Events.SEND_PRIVATE_MESSAGE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.SEND_PRIVATE_MESSAGE,
        getContext: ({ roomId, content }: SendPrivateMessagePayload) => ({ roomId, messageLength: content.trim().length }),
        handler: ({ roomId, content, meta }: SendPrivateMessagePayload) => {
            const messageStartedAt = Date.now()

            if (!currentUser) {
                observability.increment('chat.messages.failed.total', 1, { channel: 'private', source: 'api' })
                emitPrivateActionError(socket, 'Voce precisa estar conectado para enviar mensagem privada.', observability, { roomId }, meta)
                return
            }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || room.lifecycle !== 'open' || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            observability.increment('chat.messages.failed.total', 1, { channel: 'private', source: 'api' })
            emitPrivateActionError(socket, 'Sala privada invalida.', observability, getSocketContext(socket, currentUser, { roomId }), meta)
            return
        }

        const messageId = getMessageObservabilityId(meta)

        observability.increment('chat.messages.received.total', 1, { channel: 'private', source: 'api' })
        observability.info('chat.message.received', {
            ...getSocketContext(socket, currentUser),
            channel: 'private',
            correlationId: meta?.correlationId,
            interactionId: meta?.interactionId,
            messageId,
            roomId,
            messageLength: content.trim().length,
        })

        const updatedRoom = privateChatStore.addMessage(roomId, authenticatedUser, content.trim(), meta)

        if (!updatedRoom) {
            observability.increment('chat.messages.failed.total', 1, { channel: 'private', source: 'api' })
            return
        }

        const persistenceDurationMs = Date.now() - messageStartedAt

        observability.timing('chat.message.persistence.duration_ms', persistenceDurationMs, { channel: 'private', source: 'api' })
        observability.info('chat.message.persisted', {
            ...getSocketContext(socket, currentUser),
            channel: 'private',
            correlationId: meta?.correlationId,
            interactionId: meta?.interactionId,
            messageId,
            roomId,
            persistenceDurationMs,
            repository: 'PrivateChatStore',
            status: 'success',
        })

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
            const broadcastStartedAt = Date.now()
            emitPrivateRoom(io, deliveredRoom)

            const broadcastDurationMs = Date.now() - broadcastStartedAt

            observability.increment('chat.messages.sent.total', 1, { channel: 'private', source: 'api' })
            observability.timing('chat.message.broadcast.duration_ms', broadcastDurationMs, { channel: 'private', source: 'api' })
            observability.timing('chat.message.processing.duration_ms', Date.now() - messageStartedAt, { channel: 'private', source: 'api' })
            observability.info('chat.message.broadcasted', {
                ...getSocketContext(socket, currentUser),
                channel: 'private',
                correlationId: meta?.correlationId,
                interactionId: meta?.interactionId,
                messageId,
                roomId,
                broadcastDurationMs,
                recipientCount: deliveredRoom.participants.length,
                status: 'success',
            })
        }
            observability.info('chat.private.message_sent', {
                ...getSocketContext(socket, currentUser),
                correlationId: meta?.correlationId,
                roomId,
                messageLength: content.trim().length,
                totalPrivateMessages: privateChatStore.countMessages(),
            })
        },
    }))

    socket.on(Events.SET_PRIVATE_TYPING, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.SET_PRIVATE_TYPING,
        getContext: ({ roomId, isTyping }: SetPrivateTypingPayload) => ({ roomId, isTyping }),
        handler: ({ roomId, isTyping }: SetPrivateTypingPayload) => {
        if (!currentUser) {
            return
        }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || room.lifecycle !== 'open' || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            return
        }

        const updatedRoom = privateChatStore.setTyping(roomId, authenticatedUser.id, isTyping)

        if (updatedRoom) {
            io.to(roomId).emit(Events.PRIVATE_TYPING_UPDATED, {
                roomId,
                activeTypingUserIds: updatedRoom.activeTypingUserIds,
            })
        }
        },
    }))

    socket.on(Events.MARK_PRIVATE_ROOM_READ, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.MARK_PRIVATE_ROOM_READ,
        getContext: ({ roomId }: MarkPrivateRoomReadPayload) => ({ roomId }),
        handler: ({ roomId }: MarkPrivateRoomReadPayload) => {
        if (!currentUser) {
            return
        }

        const authenticatedUser = currentUser

        const room = privateChatStore.getRoomById(roomId)

        if (!room || room.lifecycle !== 'open' || !room.participants.some((participant) => participant.userId === authenticatedUser.id)) {
            return
        }

        const updatedRoom = privateChatStore.markRoomRead(roomId, authenticatedUser.id)

        if (updatedRoom) {
            emitPrivateRoom(io, updatedRoom)
        }
        },
    }))

    socket.on(Events.DELETE_PRIVATE_MESSAGE, createObservableSocketHandler({
        socket,
        observability,
        eventName: Events.DELETE_PRIVATE_MESSAGE,
        getContext: ({ roomId, messageId }: DeletePrivateMessagePayload) => ({ roomId, messageId }),
        handler: ({ roomId, messageId }: DeletePrivateMessagePayload) => {
        if (!currentUser) {
            return
        }

        const updatedRoom = privateChatStore.deleteMessage(roomId, messageId, currentUser.id)

        if (updatedRoom) {
            emitPrivateRoom(io, updatedRoom)
        }
            observability.info('chat.private.message_deleted', {
                ...getSocketContext(socket, currentUser),
                roomId,
                messageId,
            })
        },
    }))

    socket.on('disconnect', (reason) => {
        observability.increment('socket.connection.closed_total', 1)
        observability.info('socket.connection.closed', {
            socketId: socket.id,
            source: 'api',
            reason,
            connectionDurationMs: Date.now() - connectedAt,
            wasUnexpected: reason !== 'client namespace disconnect',
        })

        if (!currentUser) {
            return
        }

        for (const room of privateChatStore.getStateForUser(currentUser.id).rooms) {
            leaveObservedRoom(io, socket, room.id, currentUser, observability, `disconnect:${reason}`)
        }

        userStore.removeById(currentUser.id)
        socket.broadcast.emit(Events.OFFUSER, currentUser)
        emitUserList(io, userStore)
        observability.info('chat.session.socket_disconnected', {
            ...getSocketContext(socket, currentUser),
            activeUsers: userStore.count(),
            reason,
            connectionDurationMs: Date.now() - connectedAt,
        })
        currentUser = null
    })
}
