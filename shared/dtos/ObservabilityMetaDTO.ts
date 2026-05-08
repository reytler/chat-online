import { ObservabilityContext } from '../observability'

export type ObservabilityMetaDTO = Pick<
    ObservabilityContext,
    'correlationId' | 'interactionId' | 'traceId' | 'sessionId' | 'screen' | 'source' | 'socketId' | 'roomId' | 'route' | 'feature'
>
