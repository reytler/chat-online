export type PrivateInviteType = 'direct' | 'link'

export type PrivateInviteStatus = 'pending' | 'accepted' | 'rejected' | 'used'

export type PrivateInviteDTO = {
    id: string
    type: PrivateInviteType
    status: PrivateInviteStatus
    createdByUserId: string
    createdByName: string
    targetUserId: string | null
    targetUserName: string | null
    token: string | null
    createdAt: string
}
