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
    handleLogin: (user: Omit<UserDTO, 'idConnection'>)=>void
    socketId: string
}

const MainContext = createContext<IMainContext | undefined>(undefined)

export const MainProvider = ({children}:{children: ReactNode})=>{

    const [socket, setSocket] = useState<Socket | null>(null);
    const [socketId, setSocketId] = useState('');
    const [user,setUser] = useState<UserDTO|null>(null);
    const [connectedUsers,setConnectedUsers] = useState<UserDTO[]>([]);
    const [messages,setMessages] = useState<MessageDTO[]>([]);

    const navigate = useNavigate();

    function handleLogin(userData: Omit<UserDTO, 'idConnection'>){
        if (!socket?.connected || !socket.id) {
            notify('Conexao com o socket indisponivel. Tente novamente.', NotificationType.ERROR)
            return
        }

        const nextUser: UserDTO = {
            ...userData,
            idConnection: socket.id,
        }

        socket.emit(Events.SETUSER,nextUser)
        setUser(nextUser)
        navigate('/chat')
    }

    function handleSendMessage(message: MessageDTO){
        socket?.emit(Events.SENDMESSAGE,message)
    }

    function handleLogout(){
        if (socket?.connected && user) {
            socket.emit(Events.REMOVEUSER,user)
        }

        setUser(null)
        setMessages([])
        setConnectedUsers([])
        navigate('/')
    }

    useEffect(()=>{
        const socketIo = io("http://localhost:3001");
        setSocket(socketIo);

        socketIo.on("connect",()=>{
            console.info(`Connected ${socketIo.id}`)
            setSocketId(socketIo.id ?? '')
        });

        socketIo.on("disconnect",()=>{
            setSocketId('')
        })

        return ()=>{
            socketIo.disconnect();
        }
    },[])

    useEffect(() => {
        if (!socket?.connected || !socket.id || !user || user.idConnection === socket.id) return;

        const nextUser: UserDTO = {
            ...user,
            idConnection: socket.id,
        }

        setUser(nextUser)
        socket.emit(Events.SETUSER, nextUser)
    }, [socket, user, socketId])

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
        if(user === null) return;

        navigate('/chat')
    },[user])


    return(
        <MainContext.Provider value={{
            connectedUsers,
            handleLogout,
            handleSendMessage,
            messages,
            user,
            handleLogin,
            socketId,
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
