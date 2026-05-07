import { UserDTO } from "@shared/dtos/UserDTO"
import { MessageDTO } from "@shared/dtos/MessageDTO"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Textarea } from "../ui/textarea"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form"
import { useEffect, useRef } from "react"

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
    const messagesViewportRef = useRef<HTMLDivElement | null>(null)

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            content:''
        },
    })

    const contentValue = form.watch('content')

    useEffect(() => {
        const viewport = messagesViewportRef.current?.querySelector('[data-slot="scroll-area-viewport"]')

        if (!(viewport instanceof HTMLDivElement)) return

        viewport.scrollTop = viewport.scrollHeight
    }, [messages])

    function onSubmit(data:FormData){
        const newmessage: MessageDTO = {
            content: data.content.trim(),
            idConnection: idConnection,
            userName: userName
        }

        handleSendMessage(newmessage)
        form.resetField('content')
    }

     return(
        <div className="h-screen flex flex-col">
            <header className="p-4 shadow z-10 flex gap-2">
                <p>Olá, {userName}</p>
                <Button onClick={handleLogout}>Sair</Button>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col justify-between">
                    <ScrollArea className="flex-1 p-4 h-[60vh]" ref={messagesViewportRef}>
                        {messages.map((msg, idx) => (
                        <div key={`${msg.idConnection}-${idx}-${msg.content}`} className="mb-2 rounded bg-muted p-2 last:mb-0">
                            <strong style={{color: connectedUsers.find(cu=>cu.idConnection === msg.idConnection)?.color}}>{msg.userName}:</strong> {msg.content}
                        </div>
                        ))}
                    </ScrollArea>

                    <Separator />
                    <Form {...form}>
                        <form
                            className="flex items-center gap-2 p-4 border-t bg-background sticky bottom-0"
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FormField
                                control={form.control}
                                name="content"
                                render={({field})=>(
                                    <FormItem className="mt-5 flex flex-1 flex-col items-center">
                                        <FormControl>
                                            <Textarea
                                                placeholder="Digite sua mensagem..."
                                                className="min-h-12"
                                                {...field}
                                                onKeyDown={(e)=>{
                                                    if(e.key === "Enter" && !e.shiftKey){
                                                        e.preventDefault()
                                                        form.handleSubmit(onSubmit)()
                                                    }
                                                }}
                                                title="Enter para enviar, Shift+Enter para quebrar linha"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" disabled={!contentValue.trim()}>Enviar</Button>
                        </form>                        
                    </Form>
                </div>
                <aside className="w-60 border-l p-4 bg-muted/40">
                    <h2 className="font-semibold mb-2">Online</h2>
                    <ScrollArea className="h-full space-y-2 flex gap-1">
                        {connectedUsers.filter((usr)=>usr.idConnection !== idConnection).map((usr, i) => (
                            <div key={usr.idConnection ?? i} className="p-2 rounded shadow-sm font-bold" style={{color: usr.color}}>
                                {usr.name}
                            </div>
                        ))}
                    </ScrollArea>
                </aside>
            </div>
        </div>
     )
}
