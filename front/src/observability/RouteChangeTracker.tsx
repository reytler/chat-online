import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useObservability } from './index'

function getScreenName(pathname: string) {
    if (pathname === '/') {
        return 'login'
    }

    if (pathname === '/chat') {
        return 'public-chat'
    }

    if (pathname.startsWith('/chat/private/')) {
        return 'private-chat-room'
    }

    if (pathname.startsWith('/invite/')) {
        return 'invite'
    }

    return 'unknown'
}

export function RouteChangeTracker() {
    const location = useLocation()
    const { trackScreen } = useObservability()

    useEffect(() => {
        trackScreen(getScreenName(location.pathname), {
            pathname: location.pathname,
        })
    }, [location.pathname, trackScreen])

    return null
}
