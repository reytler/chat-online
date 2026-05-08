import { ReactNode } from 'react'
import { ObservabilityProvider } from '@/observability'
import { PrivateChatProvider, usePrivateChat } from './privateChat'
import { PublicChatProvider, usePublicChat } from './publicChat'
import { SessionProvider, useSession } from './session'

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ObservabilityProvider>
            <SessionProvider>
                <PublicChatProvider>
                    <PrivateChatProvider>
                        {children}
                    </PrivateChatProvider>
                </PublicChatProvider>
            </SessionProvider>
        </ObservabilityProvider>
    )
}

export { usePrivateChat, usePublicChat, useSession }
