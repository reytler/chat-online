import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { HomeLogin } from "./_HomeLogin";
import { UserDTO } from "@shared/dtos/UserDTO";
import { Events } from "@shared/enums/enumEvents";
import { NotificationType, notify } from "../Notification";
import { HomeView } from "../Home";
import { MessageDTO } from "@shared/dtos/MessageDTO";

export default function HomeComponent(){
    const [socket, setSocket] = useState<Socket | null>(null);
    const [user,setUser] = useState<UserDTO|null>(null);
    const [connectedUsers,setConnectedUsers] = useState<UserDTO[]>([]);
    const [messages,setMessages] = useState<MessageDTO[]>([]);

    function handleLogin(user: UserDTO){
        socket?.emit(Events.SETUSER,user)
        setUser(user)
    }

    function handleSendMessage(message: MessageDTO){
        socket?.emit(Events.SENDMESSAGE,message)
    }

    function handleLogout(){
        socket?.emit(Events.REMOVEUSER,user)
        setUser(null)
        socket?.disconnect()
        window.location.reload()
    }

    useEffect(()=>{
        const socketIo = io("http://localhost:3001");

        socketIo.on("connect",()=>{
            console.log(`Connected ${socketIo.id}`)
            setSocket(socketIo);
        });

        return ()=>{
            socketIo.disconnect();
        }
    },[])

    useEffect(()=>{
        if (!socket) return;

        function handleNewUser(user: UserDTO) {
            notify(`${user.name} Entrou...`,NotificationType.INFO)
        }

        function handleOffUser(user: UserDTO){
            notify(`${user.name} Saiu...`,NotificationType.INFO)
        }

        function handleListUsers(users: UserDTO[]){
            setConnectedUsers(users)
        }

        function handleNewMessage(messages: MessageDTO[]){
            setMessages(messages)
        }

        socket.on(Events.NEWUSER,handleNewUser)
        socket.on(Events.UPDATEUSERLIST,handleListUsers)
        socket.on(Events.OFFUSER,handleOffUser)
        socket.on(Events.NEWMESSAGE,handleNewMessage)

        return () => {
            socket.off(Events.NEWUSER, handleNewUser);
            socket.off(Events.UPDATEUSERLIST, handleListUsers);
            socket.off(Events.OFFUSER,handleOffUser);
            socket.off(Events.NEWMESSAGE,handleNewMessage)
        };
    },[socket])

    if(socket === null){
        return(
            <>
                <h1>Connecting...</h1>
            </>
        )
    }

    if(socket !== null && user === null){
        return(
            <>
                <HomeLogin handleLogin={handleLogin} idConnection={socket?.id as string}/>
            </>
        )
    }

    if(user !== null){
        return(
            <>
                <HomeView 
                    connectedUsers={connectedUsers} 
                    handleLogout={handleLogout} 
                    user={user} 
                    messages={messages}
                    handleSendMessage={handleSendMessage}
                />
            </>
        )
    }
}