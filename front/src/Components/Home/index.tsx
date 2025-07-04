import { UserDTO } from "@shared/dtos/UserDTO"
import { MessageDTO } from "@shared/dtos/MessageDTO"
import { NotificationType, notify, NotifyHeader } from "../Notification"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Textarea } from "../ui/textarea"
import { useState } from "react"

export type THomeProps = {
    connectedUsers: UserDTO[]
    user: UserDTO
    handleLogout: ()=>void
    messages: MessageDTO[]
    handleSendMessage: (message: MessageDTO)=>void
}
export function HomeView({user, handleLogout,messages, connectedUsers,handleSendMessage}: THomeProps){
    const [content,setContent] = useState<string>("");
     return(
        <div className="h-screen flex flex-col">
            <header className="p-4 shadow z-10 flex gap-2">
                <NotifyHeader/>
                <p>Olá, {user.name}</p>
                <Button onClick={handleLogout}>Sair</Button>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col justify-between">
                    <ScrollArea className="flex-1 p-4 space-y-2 h-[60vh]">
                        {messages.map((msg, idx) => (
                        <div key={idx} className="p-2 rounded bg-muted">
                            <strong style={{color: connectedUsers.find(cu=>cu.idConnection === msg.idConnection)?.color}}>{msg.userName}:</strong> {msg.content}
                        </div>
                        ))}
                    </ScrollArea>

                    <Separator />

                    <form
                        className="flex items-center gap-2 p-4 border-t bg-background sticky bottom-0"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if(content.trim() === ""){
                                notify("Digite algo antes de enviar!",NotificationType.ERROR)
                                return
                            }
                            const newmessage: MessageDTO = {
                                content: content,
                                idConnection: user.idConnection,
                                userName: user.name
                            }
                            handleSendMessage(newmessage)
                            setContent("")
                        }}
                    >
                        <Textarea
                            placeholder="Digite sua mensagem..."
                            onChange={(event) =>setContent(event.target.value)}
                            value={content}
                        />
                        <Button type="submit">Enviar</Button>
                    </form>
                </div>
                <aside className="w-60 border-l p-4 bg-muted/40">
                    <h2 className="font-semibold mb-2">Online</h2>
                    <ScrollArea className="h-full space-y-2 flex gap-1">
                        {connectedUsers.filter((usr)=>usr.idConnection !== user.idConnection).map((usr, i) => (
                            <div key={i} className="p-2 rounded shadow-sm font-bold" style={{color: usr.color}}>
                                {usr.name}
                            </div>
                        ))}
                    </ScrollArea>
                </aside>
            </div>
        </div>
     )
}