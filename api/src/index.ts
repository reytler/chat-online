import express, { Request, Response } from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './socket/registerSocketHandlers'
import { PrivateChatStore } from './stores/PrivateChatStore'
import { PublicMessageStore } from './stores/PublicMessageStore'
import { UserStore } from './stores/UserStore'

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})
const port = process.env.PORT || 3001

const userStore = new UserStore()
const publicMessageStore = new PublicMessageStore()
const privateChatStore = new PrivateChatStore()

app.use(express.json())

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello Express')
})

io.on('connection', (socket) => {
    console.log(`A host conected ${socket.id}`)

    registerSocketHandlers({
        io,
        socket,
        userStore,
        publicMessageStore,
        privateChatStore,
    })
})

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
})
