import { ObservabilityAttributes } from '@shared/observability'
import { useEffect, useRef } from 'react'
import { useObservability } from './useObservability'

type UseScreenTrackingParams = {
    screenName: string
    context?: ObservabilityAttributes
}

export function useScreenTracking({ screenName, context }: UseScreenTrackingParams) {
    const { increment, trackEvent, trackScreen } = useObservability()
    const enteredAtRef = useRef(Date.now())

    useEffect(() => {
        enteredAtRef.current = Date.now()
        trackScreen(screenName, context)

        return () => {
            const timeSpentMs = Date.now() - enteredAtRef.current
            const leftContext = {
                screen: screenName,
                timeSpentMs,
                ...context,
            }

            increment('client.screen.time_spent_ms', timeSpentMs, {
                screen: screenName,
                ...context,
            })
            trackEvent('ui.screen.left', leftContext)
        }
    }, [context, increment, screenName, trackEvent, trackScreen])
}
