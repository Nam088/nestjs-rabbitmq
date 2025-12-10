import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Resolves the RabbitMQ message from the execution context.
 * This is the internal function used by the RabbitMessage decorator.
 *
 * @param {string | undefined} data - Optional property path to extract from the message
 * @param {ExecutionContext} ctx - The NestJS execution context
 * @returns {any} The full message or a specific property if data path is provided
 *
 * @example
 * ```typescript
 * // Returns full message
 * resolveRabbitMessage(undefined, ctx);
 *
 * // Returns message.properties
 * resolveRabbitMessage('properties', ctx);
 * ```
 */
export function resolveRabbitMessage(data: string | undefined, ctx: ExecutionContext): unknown {
    const message = ctx.switchToRpc().getData();

    return data ? message?.[data] : message;
}

/**
 * Parameter decorator to get the full RabbitMQ message context.
 * Use this decorator to access the raw AMQP message including properties and fields.
 *
 * @param {string} [data] - Optional property path to extract from the message
 * @returns {ParameterDecorator} A parameter decorator that injects the message
 *
 * @example
 * ```typescript
 * class MessageHandler {
 *   @RabbitSubscribe({ queue: 'my-queue' })
 *   async handle(
 *     @RabbitMessage() fullMessage: ConsumeMessage,
 *     @RabbitMessage('properties') props: MessageProperties,
 *   ): Promise<void> {
 *     console.log('Message ID:', props.messageId);
 *   }
 * }
 * ```
 */
export const RabbitMessage = createParamDecorator(resolveRabbitMessage);

/**
 * Alias for RabbitMessage decorator.
 * Provides an alternative name for accessing the message context.
 *
 * @see {@link RabbitMessage}
 */
export const RabbitContext = RabbitMessage;
