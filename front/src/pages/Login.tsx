import { FormLogin } from "@/Components/FormLogin";
import { useMain } from "@/Contexts";

export function Login(){
    const {user,handleLogin} = useMain()
    return(
        <FormLogin
            handleLogin={handleLogin}
            idConnection={user?.idConnection !== undefined ? user?.idConnection : ""}
        />
    )
}