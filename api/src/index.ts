import express , { Request, Response } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { MessageDTO } from "@shared/dtos/MessageDTO"
import { UserDTO } from "@shared/dtos/UserDTO"
import { Events } from "@shared/enums/enumEvents"
import { Message } from "./ManageUsers/Message";
import { User } from "./ManageUsers/User";
const app = express();
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"]
    }
})
const port = process.env.PORT || 3001

app.use(express.json());

app.get("/", (req: Request, res:Response)=>{
    res.send("Hello Express")
});

io.on('connection',(socket)=>{
    console.log(`A host conected ${socket.id}`);

    socket.on(Events.SENDMESSAGE, (msg: MessageDTO)=>{
        const message = new Message(msg.content,msg.idConnection,msg.userName)
        message.createMessage(message)
        socket.broadcast.emit(Events.NEWMESSAGE, Message.returnMessagesDTO())
    })

    socket.on(Events.SETUSER,(user: UserDTO)=>{
        const newUser = new User(user.name,user.color,user.idConnection)
        newUser.createUser(newUser)
        socket.broadcast.emit(Events.NEWUSER,User.returnUsersDTO())
        socket.emit(Events.NEWUSER, User.returnUsersDTO());
    })
});

server.listen(port,()=>{
    console.log(`Server is running at http://localhost:${port}`)
});