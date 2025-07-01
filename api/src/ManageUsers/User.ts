import { UserDTO } from "@shared/dtos/UserDTO";
export class User {
    private name: string
    private color: string
    private idConnection: string
    static usersGlobal: User[] = []

    constructor(name:string,color:string,idConnection:string){
        this.name = name;
        this.color = color;
        this.idConnection = idConnection;
    }

    public createUser(user:User) {
        User.usersGlobal.push(user)
    }

    public static removeUser(user:UserDTO){
        User.usersGlobal = User.usersGlobal.filter(usr=>usr.idConnection !== user.idConnection)
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