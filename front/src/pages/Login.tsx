import { FormLogin } from "@/Components/FormLogin";
import { useMain } from "@/Contexts";
import { Navigate } from "react-router-dom";

export function Login(){
    const {user,handleLogin, socketId} = useMain()

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
