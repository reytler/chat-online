import { UserDTO } from "@shared/dtos/UserDTO"

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { HexColorPicker } from "react-colorful"
import { NotificationType, notify } from "../Notification"

const schema = z.object({
  name: z.string().min(3, 'Nome obrigatório'),
  color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, 'Cor inválida'),
})

type FormData = z.infer<typeof schema>

type TPropsHomeLogin = {
    handleLogin: (user: Omit<UserDTO, 'idConnection' | 'id'>, options?: { redirectTo?: string })=>void
    idConnection: string
    redirectTo?: string
    submitLabel?: string
    title?: string
    description?: string
}

export function FormLogin({
    handleLogin,
    idConnection,
    redirectTo,
    submitLabel = 'Entrar',
    title = 'Entrar no chat',
    description = 'Escolha seu apelido e a cor para participar.',
}:TPropsHomeLogin){
    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
           name:'',
           color:'#3498db',
        },
    })

    function onSubmit(data: FormData){
        if(idConnection){
            const user: Omit<UserDTO, 'idConnection' | 'id'> = {
                color: data.color,
                name: data.name,
            }
        
            handleLogin(user, { redirectTo })
        }else{
            notify('Falha ao conectar no chat. Aguarde a conexao e tente novamente.',NotificationType.ERROR)
        }
    }

    return(
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto mt-10 flex w-full max-w-md flex-col items-center gap-5 rounded-xl border bg-card p-6 shadow-sm">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-semibold">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <FormField
                    control={form.control}
                    name="name"
                    render={({field})=>(
                        <FormItem className="flex flex-col items-center mt-5">
                            <FormLabel>Apelido</FormLabel>
                            <FormControl>
                                <Input placeholder="Digite seu apelido..." {...field}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="color"
                    render={({field})=>(
                        <FormItem className="flex flex-col items-center">
                            <FormLabel>Escolha uma cor</FormLabel>
                            <HexColorPicker
                                color={field.value}
                                onChange={field.onChange}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={!idConnection}>{submitLabel}</Button>
            </form>
        </Form>
    )
}
