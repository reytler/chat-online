import { ChatComponent } from "@/Components/ChatComponent";
import { useMain } from "@/Contexts";

export function Chat(){
    const {connectedUsers,handleLogout,handleSendMessage,messages,user} = useMain()
    
    return(
        <ChatComponent
            connectedUsers={connectedUsers} 
            handleLogout={handleLogout} 
            userName={user?.name !== undefined ? user?.name : ""}
            idConnection={user?.idConnection !== undefined ? user?.idConnection : ""}
            messages={messages}
            handleSendMessage={handleSendMessage}
        />
    )
}