import { UserDTO } from "@shared/dtos/UserDTO"
import { NotifyHeader } from "../Notification"
import { Button } from "../ui/button"

export type THomeProps = {
    connectedUsers: UserDTO[] | null
    user: UserDTO
    handleLogout: ()=>void
}
export function Home({user, handleLogout}: THomeProps){
     return(
        <>
            <NotifyHeader/>
            <p>Olá, {user.name}</p>
            <Button onClick={handleLogout}>Sair</Button>
        </>
     )
}