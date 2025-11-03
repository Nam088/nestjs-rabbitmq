import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Parameter decorator to get the full RabbitMQ message context
 * @param data - Optional property path to extract from message
 * @param ctx - Execution context
 */
export const RabbitMessage = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
    const message = ctx.switchToRpc().getData();

    return data ? message?.[data] : message;
});

/**
 * Alias for RabbitMessage decorator
 */
export const RabbitContext = RabbitMessage;
