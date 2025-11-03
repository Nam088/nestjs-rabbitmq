import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Parameter decorator to get the full RabbitMQ message context
 * @param data - Optional property path to extract from message
 * @param ctx - Execution context
 */
export function resolveRabbitMessage(data: string | undefined, ctx: ExecutionContext): any {
    const message = ctx.switchToRpc().getData();

    return data ? message?.[data] : message;
}

export const RabbitMessage = createParamDecorator(resolveRabbitMessage);

/**
 * Alias for RabbitMessage decorator
 */
export const RabbitContext = RabbitMessage;
