import { PrivateInviteDTO } from './PrivateInviteDTO'
import { PrivateRoomDTO } from './PrivateRoomDTO'

export type PrivateStateDTO = {
    rooms: PrivateRoomDTO[]
    invites: PrivateInviteDTO[]
}
