import { SetMetadata } from '@nestjs/common';

import { RABBITMQ_SUBSCRIBE_METADATA } from '../constants';

import type { RabbitSubscribeOptions } from '../interfaces/rabbitmq-options.interface';

/**
 * Decorator to mark a method as a RabbitMQ message subscriber.
 * The decorated method will be automatically registered to consume messages from the specified queue.
 *
 * @param {RabbitSubscribeOptions} options - Subscribe configuration options
 * @returns {MethodDecorator} A method decorator that sets RabbitMQ subscribe metadata
 *
 * @example
 * ```typescript
 * class NotificationService {
 *   @RabbitSubscribe({
 *     queue: 'notifications',
 *     exchange: 'events',
 *     routingKey: 'user.created',
 *     queueOptions: { durable: true },
 *   })
 *   async handleUserCreated(message: UserCreatedEvent): Promise<void> {
 *     await this.sendWelcomeEmail(message.userId);
 *   }
 * }
 * ```
 */
export const RabbitSubscribe = (options: RabbitSubscribeOptions): MethodDecorator =>
    SetMetadata(RABBITMQ_SUBSCRIBE_METADATA, options);
