import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { HomeLogin } from "./_HomeLogin";
import { UserDTO } from "@shared/dtos/UserDTO";
import { Events } from "@shared/enums/enumEvents";

export default function HomeComponent(){
    const [socket, setSocket] = useState<Socket | null>(null);
    const [user,setUser] = useState<UserDTO|null>(null);

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

        function handleNewUser(users: UserDTO[]) {
            console.log("users: ", users);
        }

        socket.on(Events.NEWUSER,handleNewUser)
        
        return () => {
            socket.off(Events.NEWUSER, handleNewUser);
        };
    },[socket])

    function handleLogin(user: UserDTO){
        socket?.emit(Events.SETUSER,user)
        setUser(user)
    }

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
            <p>Olá, {user.name}</p>
            </>
        )
    }
}