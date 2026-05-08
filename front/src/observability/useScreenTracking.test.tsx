import { ObservabilityConfig } from '@shared/observability'
import { render } from '@testing-library/react'
import { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObservabilityProvider } from './ObservabilityProvider'
import { useScreenTracking } from './useScreenTracking'

afterEach(() => {
    vi.restoreAllMocks()
})

function TestScreen() {
    useScreenTracking({
        screenName: 'chat-room',
        context: {
            route: '/chat',
        },
    })

    return null
}

function renderWithObservability(children: ReactNode, config: ObservabilityConfig) {
    return render(
        <ObservabilityProvider config={config}>
            {children}
        </ObservabilityProvider>,
    )
}

describe('useScreenTracking', () => {
    it('tracks screen viewed and left with time spent', () => {
        let nowCallCount = 0

        vi.spyOn(Date, 'now').mockImplementation(() => {
            nowCallCount += 1

            if (nowCallCount <= 2) {
                return 1000
            }

            return 1600
        })

        const log = vi.fn()
        const metric = vi.fn()
        const config: ObservabilityConfig = {
            enabled: true,
            adapters: [{ log, metric }],
            appName: 'chat-online-front',
            environment: 'test',
            logAdapterFailures: false,
        }

        const { unmount } = renderWithObservability(<TestScreen />, config)

        unmount()

        expect(log).toHaveBeenNthCalledWith(1, expect.objectContaining({
            event: 'ui.screen.viewed',
        }))
        expect(log).toHaveBeenNthCalledWith(2, expect.objectContaining({
            event: 'ui.screen.left',
            context: expect.objectContaining({
                screen: 'chat-room',
                timeSpentMs: 600,
            }),
        }))
        expect(metric).toHaveBeenCalledWith(expect.objectContaining({
            name: 'client.screen.time_spent_ms',
            value: 600,
            unit: 'ms',
        }))
    })
})
