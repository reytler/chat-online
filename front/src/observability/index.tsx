import { ObservabilityMetaDTO } from '@shared/dtos/ObservabilityMetaDTO'
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef } from 'react'
import { createObservabilityAdapter } from './createObservabilityAdapter'
import { normalizeError } from './normalizeError'
import { ObservabilityAdapter, ObservabilityAttributes, ObservabilityLevel } from './types'

type ObservabilityContextValue = {
    captureError: (event: string, error: unknown, context?: ObservabilityAttributes) => void
    createInteractionMeta: (context?: Partial<ObservabilityMetaDTO>) => ObservabilityMetaDTO
    increment: (name: string, value?: number, tags?: ObservabilityAttributes) => void
    trackEvent: (event: string, context?: ObservabilityAttributes, level?: ObservabilityLevel) => void
    trackScreen: (screen: string, context?: ObservabilityAttributes) => void
}

const SESSION_STORAGE_KEY = 'chat-online:observability-session-id'

const ObservabilityContext = createContext<ObservabilityContextValue | undefined>(undefined)

function getOrCreateSessionId() {
    const existingSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (existingSessionId) {
        return existingSessionId
    }

    const nextSessionId = crypto.randomUUID()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextSessionId)

    return nextSessionId
}

export function ObservabilityProvider({ children }: { children: ReactNode }) {
    const adapterRef = useRef<ObservabilityAdapter>(createObservabilityAdapter())
    const currentScreenRef = useRef('unknown')
    const sessionIdRef = useRef(getOrCreateSessionId())

    const writeLog = useCallback((level: ObservabilityLevel, event: string, context?: ObservabilityAttributes) => {
        adapterRef.current.log({
            level,
            event,
            timestamp: new Date().toISOString(),
            context: {
                sessionId: sessionIdRef.current,
                screen: currentScreenRef.current,
                source: 'front',
                ...context,
            },
        })
    }, [])

    const captureError = useCallback((event: string, error: unknown, context?: ObservabilityAttributes) => {
        adapterRef.current.log({
            level: 'error',
            event,
            timestamp: new Date().toISOString(),
            context: {
                sessionId: sessionIdRef.current,
                screen: currentScreenRef.current,
                source: 'front',
                ...context,
            },
            error: normalizeError(error),
        })
    }, [])

    const increment = useCallback((name: string, value = 1, tags?: ObservabilityAttributes) => {
        adapterRef.current.metric({
            name,
            value,
            timestamp: new Date().toISOString(),
            tags: {
                sessionId: sessionIdRef.current,
                screen: currentScreenRef.current,
                source: 'front',
                ...tags,
            },
        })
    }, [])

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
            sessionId: sessionIdRef.current,
            screen: context?.screen ?? currentScreenRef.current,
            source: 'front',
            socketId: context?.socketId,
            roomId: context?.roomId,
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
            trackEvent,
            trackScreen,
        }}>
            {children}
        </ObservabilityContext.Provider>
    )
}

export function useObservability() {
    const context = useContext(ObservabilityContext)

    if (!context) {
        throw new Error('useObservability deve ser usado dentro de ObservabilityProvider')
    }

    return context
}
