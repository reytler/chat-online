import express, { Request, Response } from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createObservabilityConfig } from './observability/createObservabilityConfig'
import { ObservabilityService } from './observability/ObservabilityService'
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
const observability = new ObservabilityService(createObservabilityConfig())

function reportRuntimeMetrics() {
    observability.runtimeSnapshot({ source: 'api' })
    observability.gauge('runtime.chat.active_sockets', io.sockets.sockets.size, { source: 'api' })
    observability.gauge('runtime.chat.active_users', userStore.count(), { source: 'api' })
    observability.gauge('runtime.chat.public_messages', publicMessageStore.count(), { source: 'api' })
    observability.gauge('runtime.chat.private_open_rooms', privateChatStore.countOpenRooms(), { source: 'api' })
    observability.gauge('runtime.chat.private_messages', privateChatStore.countMessages(), { source: 'api' })
}

let isShuttingDown = false

function shutdown(signal: string) {
    if (isShuttingDown) {
        return
    }

    isShuttingDown = true
    observability.info('server.shutdown.started', { signal })
    reportRuntimeMetrics()

    server.close((error) => {
        if (error) {
            observability.captureError('server.shutdown.failed', error, { signal })
            process.exit(1)
            return
        }

        observability.info('server.shutdown.completed', { signal })
        process.exit(0)
    })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('uncaughtException', (error) => {
    observability.captureError('server.process.uncaught_exception', error, { source: 'api' })
})
process.on('unhandledRejection', (reason) => {
    observability.captureError('server.process.unhandled_rejection', reason, { source: 'api' })
})

app.use(express.json())

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello Express')
})

io.on('connection', (socket) => {
    observability.increment('socket.connection.opened_total', 1)
    observability.info('socket.connection.opened', {
        source: 'api',
        socketId: socket.id,
        activeSockets: io.sockets.sockets.size,
    })
    reportRuntimeMetrics()

    registerSocketHandlers({
        io,
        socket,
        userStore,
        publicMessageStore,
        privateChatStore,
        observability,
    })
})

server.listen(port, () => {
    observability.info('server.started', {
        source: 'api',
        port: Number(port),
    })
    reportRuntimeMetrics()
})

const runtimeMetricsInterval = setInterval(() => {
    reportRuntimeMetrics()
}, 60000)

runtimeMetricsInterval.unref()
