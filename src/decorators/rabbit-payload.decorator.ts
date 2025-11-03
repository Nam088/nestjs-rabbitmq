import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Parameter decorator to extract the payload from a RabbitMQ message
 * @param data - Optional property path to extract from payload
 * @param ctx - Execution context
 */
export const RabbitPayload = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
    const message = ctx.switchToRpc().getData();

    if (!message) {
        return null;
    }

    // If message has a content property (ConsumeMessage from amqplib)
    if (message.content) {
        try {
            const payload = JSON.parse(message.content.toString());

            return data ? payload?.[data] : payload;
        } catch {
            return message.content.toString();
        }
    }

    // Otherwise return the message itself
    return data ? message?.[data] : message;
});
