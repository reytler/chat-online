import { FormLogin } from '@/Components/FormLogin'
import { Button } from '@/Components/ui/button'
import { usePrivateChat, useSession } from '@/Contexts'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

export function Invite() {
    const { token = '' } = useParams()
    const { user, handleLogin, socketId } = useSession()
    const { joinPrivateRoomByToken } = usePrivateChat()
    const [hasJoined, setHasJoined] = useState(false)

    useEffect(() => {
        if (!user || !token || hasJoined) {
            return
        }

        joinPrivateRoomByToken(token)
        setHasJoined(true)
    }, [hasJoined, joinPrivateRoomByToken, token, user])

    if (!token) {
        return <Navigate to="/" replace />
    }

    if (!user) {
        return (
            <FormLogin
                handleLogin={handleLogin}
                idConnection={socketId}
                redirectTo={`/invite/${token}`}
                submitLabel="Entrar na sala privada"
                title="Convite para chat privado"
                description="Escolha apelido e cor para entrar pela primeira vez neste convite."
            />
        )
    }

    return (
        <div className="mx-auto mt-10 flex max-w-md flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
            <div>
                <h1 className="text-2xl font-semibold">Entrar pelo convite</h1>
                <p className="text-sm text-muted-foreground">Assim que o link for validado, a sala privada sera aberta.</p>
            </div>
            <Button onClick={() => joinPrivateRoomByToken(token)}>
                Entrar agora
            </Button>
        </div>
    )
}
