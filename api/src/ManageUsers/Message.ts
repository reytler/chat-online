import { MessageDTO } from "@shared/dtos/MessageDTO";

export class Message{
    private content: string;
    private idConnection: string;
    private userName: string;
    static messagesGlobal: Message[] = []

    constructor(content:string, idConnection: string,userName: string){
        this.content = content;
        this.idConnection = idConnection;
        this.userName = userName;
    }

    public createMessage(message:Message){
        Message.messagesGlobal.push(message)
    }

    public static returnMessagesDTO(){
        return Message.messagesGlobal.map((msg:Message)=>{
            const message: MessageDTO = {
                content: msg.content,
                idConnection: msg.idConnection,
                userName: msg.userName
            }

            return message
        })
    }
}