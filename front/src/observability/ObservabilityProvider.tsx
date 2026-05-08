import { ObservabilityMetaDTO } from '@shared/dtos/ObservabilityMetaDTO'
import { ObservabilityAdapter, ObservabilityAttributes, ObservabilityConfig, ObservabilityLevel } from '@shared/observability'
import { ReactNode, useCallback, useEffect, useRef } from 'react'
import { createObservabilityConfig } from './createObservabilityConfig'
import { normalizeError } from './normalizeError'
import { ObservabilityContext } from './observabilityContext'

const SESSION_STORAGE_KEY = 'chat-online:observability-session-id'

function getOrCreateSessionId() {
    const existingSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (existingSessionId) {
        return existingSessionId
    }

    const nextSessionId = crypto.randomUUID()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextSessionId)

    return nextSessionId
}

export function ObservabilityProvider({ children, config = createObservabilityConfig() }: { children: ReactNode, config?: ObservabilityConfig }) {
    const adapterRef = useRef<ObservabilityAdapter[]>(config.adapters)
    const configRef = useRef(config)
    const currentScreenRef = useRef('unknown')
    const sessionIdRef = useRef(getOrCreateSessionId())

    const forEachAdapter = useCallback((operation: (adapter: ObservabilityAdapter) => void) => {
        if (!configRef.current.enabled) {
            return
        }

        for (const adapter of adapterRef.current) {
            try {
                operation(adapter)
            } catch (error) {
                if (configRef.current.logAdapterFailures) {
                    console.warn('[observability] adapter failure', normalizeError(error))
                }
            }
        }
    }, [])

    const withBaseContext = useCallback((context?: ObservabilityAttributes) => ({
        appName: configRef.current.appName,
        environment: configRef.current.environment,
        sessionId: sessionIdRef.current,
        screen: currentScreenRef.current,
        source: 'front' as const,
        ...context,
    }), [])

    const writeLog = useCallback((level: ObservabilityLevel, event: string, context?: ObservabilityAttributes) => {
        forEachAdapter((adapter) => {
            adapter.log({
                level,
                event,
                timestamp: new Date().toISOString(),
                context: withBaseContext(context),
            })
        })
    }, [forEachAdapter, withBaseContext])

    const captureError = useCallback((event: string, error: unknown, context?: ObservabilityAttributes) => {
        forEachAdapter((adapter) => {
            adapter.log({
                level: 'error',
                event,
                timestamp: new Date().toISOString(),
                context: withBaseContext(context),
                error: normalizeError(error),
            })
        })
    }, [forEachAdapter, withBaseContext])

    const increment = useCallback((name: string, value = 1, tags?: ObservabilityAttributes) => {
        forEachAdapter((adapter) => {
            adapter.metric({
                name,
                value,
                timestamp: new Date().toISOString(),
                unit: 'count',
                tags: withBaseContext(tags),
            })
        })
    }, [forEachAdapter, withBaseContext])

    const timing = useCallback((name: string, value: number, tags?: ObservabilityAttributes) => {
        forEachAdapter((adapter) => {
            adapter.metric({
                name,
                value,
                timestamp: new Date().toISOString(),
                unit: 'ms',
                tags: withBaseContext(tags),
            })
        })
    }, [forEachAdapter, withBaseContext])

    const trackEvent = useCallback((event: string, context?: ObservabilityAttributes, level: ObservabilityLevel = 'info') => {
        writeLog(level, event, context)
    }, [writeLog])

    const trackScreen = useCallback((screen: string, context?: ObservabilityAttributes) => {
        currentScreenRef.current = screen
        writeLog('info', 'ui.screen.viewed', {
            screen,
            ...context,
        })
    }, [writeLog])

    const createInteractionMeta = useCallback((context?: Partial<ObservabilityMetaDTO>) => {
        return {
            correlationId: crypto.randomUUID(),
            interactionId: crypto.randomUUID(),
            traceId: crypto.randomUUID(),
            sessionId: sessionIdRef.current,
            screen: context?.screen ?? currentScreenRef.current,
            source: 'front' as const,
            socketId: context?.socketId,
            roomId: context?.roomId,
            route: context?.route,
            feature: context?.feature,
        }
    }, [])

    useEffect(() => {
        function handleWindowError(event: ErrorEvent) {
            captureError('ui.window.error', event.error ?? event.message, {
                filename: event.filename,
                lineNumber: event.lineno,
                columnNumber: event.colno,
            })
        }

        function handleUnhandledRejection(event: PromiseRejectionEvent) {
            captureError('ui.window.unhandled_rejection', event.reason)
        }

        window.addEventListener('error', handleWindowError)
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        return () => {
            window.removeEventListener('error', handleWindowError)
            window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
    }, [captureError])

    return (
        <ObservabilityContext.Provider value={{
            captureError,
            createInteractionMeta,
            increment,
            timing,
            trackEvent,
            trackScreen,
        }}>
            {children}
        </ObservabilityContext.Provider>
    )
}
