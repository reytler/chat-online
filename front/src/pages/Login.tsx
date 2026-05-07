import { FormLogin } from "@/Components/FormLogin";
import { useSession } from "@/Contexts";
import { Navigate } from "react-router-dom";

export function Login(){
    const {user,handleLogin, socketId} = useSession()

    if (user) {
        return <Navigate to="/chat" replace />
    }

    return(
        <FormLogin
            handleLogin={handleLogin}
            idConnection={socketId}
        />
    )
}
