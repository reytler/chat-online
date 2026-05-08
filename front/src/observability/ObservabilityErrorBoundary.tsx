import { Component, ErrorInfo, ReactNode } from 'react'
import { useObservability } from './index'

type ErrorBoundaryProps = {
    children: ReactNode
    onError: (error: Error, errorInfo: ErrorInfo) => void
    screenName?: string
}

type ErrorBoundaryState = {
    hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
    }

    public static getDerivedStateFromError() {
        return { hasError: true }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError(error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
                    <div className="max-w-md space-y-2 rounded-xl border bg-card p-6 shadow-sm">
                        <h1 className="text-xl font-semibold">Algo deu errado</h1>
                        <p className="text-sm text-muted-foreground">Recarregue a pagina para tentar novamente.</p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export function ObservabilityErrorBoundary({ children }: { children: ReactNode }) {
    const { captureError } = useObservability()

    return (
        <ErrorBoundary
            screenName={window.location.pathname}
            onError={(error, errorInfo) => {
                captureError('ui.error_boundary.caught', error, {
                    componentStack: errorInfo.componentStack,
                    environment: import.meta.env.MODE,
                    isOnline: navigator.onLine,
                    pathname: window.location.pathname,
                    screenName: window.location.pathname,
                    userAgent: navigator.userAgent,
                })
            }}
        >
            {children}
        </ErrorBoundary>
    )
}
