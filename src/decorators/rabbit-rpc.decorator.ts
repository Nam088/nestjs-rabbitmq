import { SetMetadata } from '@nestjs/common';

export const RABBIT_RPC_METADATA = 'RABBIT_RPC_METADATA';

export interface RabbitRPCOptions {
    connectionName?: string;
    noAck?: boolean;
    prefetchCount?: number;
    queue: string;
}

/**
 * Decorator to mark a method as a RabbitMQ RPC handler (request-reply pattern)
 * @param options - RPC configuration options
 */
export const RabbitRPC = (options: RabbitRPCOptions) => SetMetadata(RABBIT_RPC_METADATA, options);
