import { UserDTO } from "@shared/dtos/UserDTO"
import { MessageDTO } from "@shared/dtos/MessageDTO"
import { NotifyHeader } from "../Notification"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Textarea } from "../ui/textarea"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form"

export type THomeProps = {
    connectedUsers: UserDTO[]
    userName: string
    idConnection: string
    handleLogout: ()=>void
    messages: MessageDTO[]
    handleSendMessage: (message: MessageDTO)=>void
}

const schema = z.object({
  content: z.string().min(2, 'Digite uma mensagem para enviar'),
})

type FormData = z.infer<typeof schema>

export function ChatComponent({userName, idConnection, handleLogout,messages, connectedUsers,handleSendMessage}: THomeProps){

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            content:''
        },
    })

    function onSubmit(data:FormData){
        const newmessage: MessageDTO = {
            content: data.content,
            idConnection: idConnection,
            userName: userName
        }
        handleSendMessage(newmessage)
    }

     return(
        <div className="h-screen flex flex-col">
            <header className="p-4 shadow z-10 flex gap-2">
                <NotifyHeader/>
                <p>Olá, {userName}</p>
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
                    <Form {...form}>
                        <form
                            className="flex items-center gap-2 p-4 border-t bg-background sticky bottom-0"
                            onSubmit={form.handleSubmit((data)=>{
                                onSubmit(data)
                                form.resetField('content')
                            })}
                        >
                            <FormField
                                control={form.control}
                                name="content"
                                render={({field})=>(
                                    <FormItem className="flex flex-col items-center mt-5">
                                        <FormControl>
                                            <Textarea
                                                placeholder="Digite sua mensagem..."
                                                {...field}
                                                onKeyDown={(e)=>{
                                                    if(e.key === "Enter" && e.shiftKey){
                                                        e.preventDefault()
                                                        form.handleSubmit((data)=>{
                                                            onSubmit(data)
                                                            form.resetField('content')
                                                        })()
                                                    }
                                                }}
                                                title="shift+Enter para enviar"                                
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit">Enviar</Button>
                        </form>                        
                    </Form>
                </div>
                <aside className="w-60 border-l p-4 bg-muted/40">
                    <h2 className="font-semibold mb-2">Online</h2>
                    <ScrollArea className="h-full space-y-2 flex gap-1">
                        {connectedUsers.filter((usr)=>usr.idConnection !== idConnection).map((usr, i) => (
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