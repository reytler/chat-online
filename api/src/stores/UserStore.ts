import { UserDTO } from '@shared/dtos/UserDTO'

export class UserStore {
    private users = new Map<string, UserDTO>()

    public upsert(user: UserDTO) {
        this.users.set(user.id, user)
    }

    public removeById(userId: string) {
        this.users.delete(userId)
    }

    public getById(userId: string) {
        return this.users.get(userId) ?? null
    }

    public getByConnectionId(idConnection: string) {
        return [...this.users.values()].find((user) => user.idConnection === idConnection) ?? null
    }

    public getAll() {
        return [...this.users.values()]
    }
}
