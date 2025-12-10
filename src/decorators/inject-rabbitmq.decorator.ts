import { Inject } from '@nestjs/common';

import { DEFAULT_CONNECTION_NAME, RABBITMQ_SERVICE } from '../constants';

/**
 * Parameter decorator to inject the RabbitMQ service instance.
 * Use this decorator in constructor parameters to get access to RabbitMQService.
 *
 * @param {string} [connectionName='default'] - The name of the RabbitMQ connection to inject
 * @returns {ParameterDecorator} A parameter decorator that injects the RabbitMQ service
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MessagePublisher {
 *   constructor(
 *     @InjectRabbitMQ() private readonly rabbitMQ: RabbitMQService,
 *     @InjectRabbitMQ('secondary') private readonly secondaryRabbitMQ: RabbitMQService,
 *   ) {}
 *
 *   async publish(message: any): Promise<void> {
 *     await this.rabbitMQ.publish('exchange', 'routing.key', message);
 *   }
 * }
 * ```
 */
export const InjectRabbitMQ = (connectionName: string = DEFAULT_CONNECTION_NAME): ParameterDecorator =>
    Inject(`${RABBITMQ_SERVICE}_${connectionName}`);
