import { ReactNode } from 'react'
import { PrivateChatProvider, usePrivateChat } from './privateChat'
import { PublicChatProvider, usePublicChat } from './publicChat'
import { SessionProvider, useSession } from './session'

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <PublicChatProvider>
                <PrivateChatProvider>
                    {children}
                </PrivateChatProvider>
            </PublicChatProvider>
        </SessionProvider>
    )
}

export { usePrivateChat, usePublicChat, useSession }
