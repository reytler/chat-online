import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function HomeComponent(){
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(()=>{
        const socketIo = io("http://localhost:3001");

        socketIo.on("connect",()=>{
            console.log(`Connected ${socketIo.id}`)
        });

        setSocket(socketIo);

        return ()=>{
            socketIo.disconnect();
        }
    },[])

    useEffect(()=>{
        console.log("socket: ",socket)
    },[socket])

    return(
        <>
            <h1>Home</h1>
        </>
    )
}