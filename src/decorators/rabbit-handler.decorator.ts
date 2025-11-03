import { SetMetadata } from '@nestjs/common';

export const RABBIT_HANDLER_METADATA = 'RABBIT_HANDLER_METADATA';

export interface RabbitHandlerOptions {
    connectionName?: string;
    exchange?: string;
    noAck?: boolean;
    prefetchCount?: number;
    queue?: string;
    routingKey?: string;
}

/**
 * Decorator to mark a method as a RabbitMQ message handler
 * @param options - Handler configuration options
 */
export const RabbitHandler = (options: RabbitHandlerOptions) => SetMetadata(RABBIT_HANDLER_METADATA, options);
