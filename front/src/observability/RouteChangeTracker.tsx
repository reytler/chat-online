import { useLocation } from 'react-router-dom'
import { useScreenTracking } from './useScreenTracking'

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
    const screenName = getScreenName(location.pathname)

    useScreenTracking({
        screenName,
        context: {
            pathname: location.pathname,
            route: location.pathname,
        },
    })

    return null
}
