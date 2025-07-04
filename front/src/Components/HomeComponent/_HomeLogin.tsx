import { UserDTO } from "@shared/dtos/UserDTO"

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { HexColorPicker } from "react-colorful"

const schema = z.object({
  name: z.string().min(3, 'Nome obrigatório'),
  color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, 'Cor inválida'),
})

type FormData = z.infer<typeof schema>

type TPropsHomeLogin = {
    handleLogin: (user: UserDTO)=>void
    idConnection: string
}

export function HomeLogin({handleLogin,idConnection}:TPropsHomeLogin){
    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
           name:'',
           color:'#3498db',
        },
    })

    function onSubmit(data: FormData){
        if(idConnection !== undefined){
            const user: UserDTO = {
                color: data.color,
                name: data.name,
                idConnection: idConnection
            }
        
            handleLogin(user)
        }else{
            console.log('Falha ao encontrar id do socket: ',idConnection)
            alert(`Falha ao encontrar id do socket: ${idConnection}`)
        }
    }

    return(
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col justify-center items-center gap-5 mt-5">
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
                <Button type="submit">Entrar</Button>
            </form>
        </Form>
    )
}