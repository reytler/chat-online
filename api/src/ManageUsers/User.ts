import { UserDTO } from "@shared/dtos/UserDTO";
import { Message } from "./Message";

export class User {
    private name: string
    private color: string
    private idConnection: string | undefined
    static usersGlobal: User[] = []

    constructor(name:string,color:string,idConnection:string | undefined){
        this.name = name;
        this.color = color;
        this.idConnection = idConnection;
    }

    public createUser(user:User) {
        User.usersGlobal.push(user)
    }

    public talk(message:Message){
        message.createMessage(message)
    }

    public static returnUsersDTO(){
        return User.usersGlobal.map((user:User)=>{
            const userDTO: UserDTO = {
                color: user.color,
                idConnection: user.idConnection,
                name: user.name
            }

            return userDTO
        })
    }
}