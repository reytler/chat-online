import { ToastContainer, ToastContent, ToastOptions, toast } from "react-toastify";

export enum NotificationType {
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    INFO = 'INFO'
}

export function notify(message: string, type: NotificationType){
    switch(type){
        case NotificationType.ERROR:
            toast.error(message)
            break;
        case NotificationType.INFO:
            toast.info(message)
            break;
        case NotificationType.SUCCESS:
            toast.success(message)
            break;
        default:
            toast.info(message)
            break;
    }
}

export function NotifyHeader(){
    return(
        <>
            <ToastContainer/>
        </>
    )
}