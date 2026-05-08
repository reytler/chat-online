import { io } from 'socket.io-client'
import { getApiBaseUrl } from './getApiBaseUrl'

export function createSocketClient() {
    return io(getApiBaseUrl())
}
