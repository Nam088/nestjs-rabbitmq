import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Parameter decorator to extract the payload from a RabbitMQ message
 * @param data - Optional property path to extract from payload
 * @param ctx - Execution context
 */
export function resolveRabbitPayload(data: string | undefined, ctx: ExecutionContext): any {
    const message: any = ctx.switchToRpc().getData();

    if (!message) {
        return null;
    }

    if (message.content) {
        try {
            const payload = JSON.parse(message.content.toString());
            return data ? payload?.[data] : payload;
        } catch {
            return message.content.toString();
        }
    }

    return data ? message?.[data] : message;
}

export const RabbitPayload = createParamDecorator(resolveRabbitPayload);
