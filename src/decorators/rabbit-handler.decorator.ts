import { SetMetadata } from '@nestjs/common';

import { RABBIT_HANDLER_METADATA } from '../constants';

import type { RabbitHandlerOptions } from '../interfaces/rabbitmq-options.interface';

/**
 * Decorator to mark a method as a RabbitMQ message handler.
 * Use this decorator on methods that should consume messages from RabbitMQ queues.
 *
 * @param {RabbitHandlerOptions} options - Handler configuration options
 * @returns {MethodDecorator} A method decorator that sets RabbitMQ handler metadata
 *
 * @example
 * ```typescript
 * class MessageService {
 *   @RabbitHandler({
 *     queue: 'my-queue',
 *     exchange: 'my-exchange',
 *     routingKey: 'my.routing.key',
 *   })
 *   async handleMessage(message: MyMessageType): Promise<void> {
 *     console.log('Received:', message);
 *   }
 * }
 * ```
 */
export const RabbitHandler = (options: RabbitHandlerOptions): MethodDecorator =>
    SetMetadata(RABBIT_HANDLER_METADATA, options);
