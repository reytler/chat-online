import { NotificationType, notify } from "@/Components/Notification";
import { MessageDTO } from "@shared/dtos/MessageDTO";
import { UserDTO } from "@shared/dtos/UserDTO";
import { Events } from "@shared/enums/enumEvents";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";

interface IMainContext {
    connectedUsers: UserDTO[]
    handleLogout: ()=>void
    user: UserDTO | null
    messages: MessageDTO[]
    handleSendMessage: (message: MessageDTO)=>void
    handleLogin: (user: UserDTO)=>void
}

const MainContext = createContext<IMainContext | undefined>(undefined)

export const MainProvider = ({children}:{children: ReactNode})=>{

    const [socket, setSocket] = useState<Socket | null>(null);
    const [user,setUser] = useState<UserDTO|null>(null);
    const [connectedUsers,setConnectedUsers] = useState<UserDTO[]>([]);
    const [messages,setMessages] = useState<MessageDTO[]>([]);

    const navigate = useNavigate();

    function handleLogin(user: UserDTO){
        socket?.emit(Events.SETUSER,user)
        setUser(user)
        navigate('/chat')
    }

    function handleSendMessage(message: MessageDTO){
        socket?.emit(Events.SENDMESSAGE,message)
    }

    function handleLogout(){
        navigate('/')
        socket?.emit(Events.REMOVEUSER,user)
        setUser(null)
        socket?.disconnect()
        window.location.reload()
    }

    useEffect(()=>{
        const socketIo = io("http://localhost:3001");

        socketIo.on("connect",()=>{
            console.info(`Connected ${socketIo.id}`)
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

    useEffect(()=>{
        if(user === null){
            navigate('/')
        }
    },[user])


    return(
        <MainContext.Provider value={{
            connectedUsers,
            handleLogout,
            handleSendMessage,
            messages,
            user,
            handleLogin
        }}>
            {children}
        </MainContext.Provider>
    )
}

export const useMain = (): IMainContext =>{
    const context = useContext(MainContext);

    if(!context){
        throw new Error('useMain deve ser usado dentro de um MainProvider');
    }

    return context
}