import { ChatComponent } from "@/Components/ChatComponent";
import { useMain } from "@/Contexts";
import { Navigate } from "react-router-dom";

export function Chat(){
    const {connectedUsers,handleLogout,handleSendMessage,messages,user} = useMain()

    if (!user) {
        return <Navigate to="/" replace />
    }
    
    return(
        <ChatComponent
            connectedUsers={connectedUsers} 
            handleLogout={handleLogout} 
            userName={user.name}
            idConnection={user.idConnection}
            messages={messages}
            handleSendMessage={handleSendMessage}
        />
    )
}
