import { ObservabilityAdapter, ObservabilityConfig } from '@shared/observability'
import { describe, expect, it, vi } from 'vitest'
import { ObservabilityService } from './ObservabilityService'

function createConfig(adapters: ObservabilityAdapter[]): ObservabilityConfig {
    return {
        enabled: true,
        adapters,
        appName: 'chat-online-api',
        environment: 'test',
        logAdapterFailures: false,
    }
}

describe('ObservabilityService', () => {
    it('writes to every configured adapter', () => {
        const firstAdapter = {
            log: vi.fn(),
            metric: vi.fn(),
        }
        const secondAdapter = {
            log: vi.fn(),
            metric: vi.fn(),
        }
        const service = new ObservabilityService(createConfig([firstAdapter, secondAdapter]))

        service.info('socket.connected', { socketId: 'abc' })
        service.increment('socket.connections.total', 1, { source: 'api' })

        expect(firstAdapter.log).toHaveBeenCalledTimes(1)
        expect(secondAdapter.log).toHaveBeenCalledTimes(1)
        expect(firstAdapter.metric).toHaveBeenCalledTimes(1)
        expect(secondAdapter.metric).toHaveBeenCalledTimes(1)
    })

    it('isolates adapter failures', () => {
        const healthyAdapter = {
            log: vi.fn(),
            metric: vi.fn(),
        }
        const failingAdapter = {
            log: vi.fn(() => {
                throw new Error('adapter down')
            }),
            metric: vi.fn(() => {
                throw new Error('adapter down')
            }),
        }
        const service = new ObservabilityService(createConfig([failingAdapter, healthyAdapter]))

        expect(() => service.info('socket.connected')).not.toThrow()
        expect(() => service.increment('socket.connections.total')).not.toThrow()
        expect(healthyAdapter.log).toHaveBeenCalledTimes(1)
        expect(healthyAdapter.metric).toHaveBeenCalledTimes(1)
    })
})
