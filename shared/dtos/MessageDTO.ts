import { ObservabilityMetaDTO } from './ObservabilityMetaDTO'

export type MessageDTO = {
    content: string
    idConnection: string
    userName: string
    meta?: ObservabilityMetaDTO
}
