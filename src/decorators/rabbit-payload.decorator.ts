import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Resolves the payload from a RabbitMQ message.
 * Automatically parses JSON content from message.content buffer.
 *
 * @param {string | undefined} data - Optional property path to extract from the parsed payload
 * @param {ExecutionContext} ctx - The NestJS execution context
 * @returns {unknown} The parsed payload, a specific property, or null if message is falsy
 *
 * @example
 * ```typescript
 * // Message content: '{"userId": 123, "action": "login"}'
 *
 * // Returns { userId: 123, action: 'login' }
 * resolveRabbitPayload(undefined, ctx);
 *
 * // Returns 123
 * resolveRabbitPayload('userId', ctx);
 * ```
 */
export function resolveRabbitPayload(data: string | undefined, ctx: ExecutionContext): unknown {
    const message = ctx.switchToRpc().getData();

    if (!message) {
        return null;
    }

    // Handle raw AMQP message with content buffer
    if ('content' in message && message.content) {
        try {
            const payload = JSON.parse(message.content.toString()) as Record<string, unknown>;

            return data ? payload?.[data] : payload;
        } catch {
            // Return raw string if JSON parse fails
            return message.content.toString();
        }
    }

    // Handle pre-parsed message
    return data ? (message as Record<string, unknown>)?.[data] : message;
}

/**
 * Parameter decorator to extract the payload from a RabbitMQ message.
 * Automatically handles JSON parsing from the message content buffer.
 *
 * @param {string} [data] - Optional property path to extract from the payload
 * @returns {ParameterDecorator} A parameter decorator that injects the payload
 *
 * @example
 * ```typescript
 * interface OrderPayload {
 *   orderId: string;
 *   items: OrderItem[];
 *   total: number;
 * }
 *
 * class OrderHandler {
 *   @RabbitSubscribe({ queue: 'orders' })
 *   async handle(
 *     @RabbitPayload() payload: OrderPayload,
 *     @RabbitPayload('orderId') orderId: string,
 *   ): Promise<void> {
 *     console.log('Processing order:', orderId);
 *     console.log('Total items:', payload.items.length);
 *   }
 * }
 * ```
 */
export const RabbitPayload = createParamDecorator(resolveRabbitPayload);
