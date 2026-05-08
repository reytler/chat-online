import { MessageDTO } from '@shared/dtos/MessageDTO'

export class PublicMessageStore {
    private messages: MessageDTO[] = []

    public add(message: MessageDTO) {
        this.messages.push(message)
    }

    public getAll() {
        return [...this.messages]
    }

    public count() {
        return this.messages.length
    }
}
