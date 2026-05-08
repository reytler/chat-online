import express, { Request, Response } from 'express'
import { createServer } from 'node:http'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import { Server } from 'socket.io'
import { createObservabilityConfig } from './observability/createObservabilityConfig'
import { createHttpErrorMiddleware } from './observability/createHttpErrorMiddleware'
import { createHttpObservabilityMiddleware } from './observability/createHttpObservabilityMiddleware'
import { initSentry } from './observability/sentry/initSentry'
import { ObservabilityService } from './observability/ObservabilityService'
import { registerSocketHandlers } from './socket/registerSocketHandlers'
import { PrivateChatStore } from './stores/PrivateChatStore'
import { PublicMessageStore } from './stores/PublicMessageStore'
import { UserStore } from './stores/UserStore'

initSentry()

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
const eventLoopDelayMonitor = monitorEventLoopDelay({ resolution: 20 })
let previousCpuUsage = process.cpuUsage()
let previousCpuCheckAt = process.hrtime.bigint()

eventLoopDelayMonitor.enable()

function toMegabytes(value: number) {
    return Number((value / (1024 * 1024)).toFixed(2))
}

function getCpuUsagePercent() {
    const currentCpuUsage = process.cpuUsage()
    const currentCheckAt = process.hrtime.bigint()
    const elapsedMicroseconds = Number(currentCheckAt - previousCpuCheckAt) / 1000

    if (elapsedMicroseconds <= 0) {
        return 0
    }

    const cpuUsageDelta = process.cpuUsage(previousCpuUsage)
    const cpuPercent = ((cpuUsageDelta.user + cpuUsageDelta.system) / elapsedMicroseconds) * 100

    previousCpuUsage = currentCpuUsage
    previousCpuCheckAt = currentCheckAt

    return Number(cpuPercent.toFixed(2))
}

function reportRuntimeMetrics() {
    const memoryUsage = process.memoryUsage()

    observability.runtimeSnapshot({ source: 'api' })
    observability.gauge('socket.connections.active', io.sockets.sockets.size, { source: 'api' })
    observability.gauge('chat.users.active', userStore.count(), { source: 'api' })
    observability.gauge('chat.public.messages.total', publicMessageStore.count(), { source: 'api' })
    observability.gauge('chat.private.rooms.active', privateChatStore.countOpenRooms(), { source: 'api' })
    observability.gauge('chat.private.messages.total', privateChatStore.countMessages(), { source: 'api' })
    observability.gauge('node.memory.heap_used_mb', toMegabytes(memoryUsage.heapUsed), { source: 'api' })
    observability.gauge('node.cpu.usage_percent', getCpuUsagePercent(), { source: 'api' })
    observability.gauge('node.event_loop.lag_ms', Number((eventLoopDelayMonitor.mean / 1_000_000).toFixed(2)), { source: 'api' })
    observability.gauge('runtime.chat.active_sockets', io.sockets.sockets.size, { source: 'api' })
    observability.gauge('runtime.chat.active_users', userStore.count(), { source: 'api' })
    observability.gauge('runtime.chat.public_messages', publicMessageStore.count(), { source: 'api' })
    observability.gauge('runtime.chat.private_open_rooms', privateChatStore.countOpenRooms(), { source: 'api' })
    observability.gauge('runtime.chat.private_messages', privateChatStore.countMessages(), { source: 'api' })

    eventLoopDelayMonitor.reset()
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
process.on('exit', () => {
    eventLoopDelayMonitor.disable()
})

app.use(express.json())
app.use(createHttpObservabilityMiddleware(observability))

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello Express')
})

app.use(createHttpErrorMiddleware(observability))

io.on('connection', (socket) => {
    observability.increment('socket.connection.opened_total', 1)
    observability.increment('socket.connections.total', 1, { source: 'api' })
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
