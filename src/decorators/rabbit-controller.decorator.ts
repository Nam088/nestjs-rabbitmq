import { SetMetadata } from '@nestjs/common';

import { RABBIT_CONTROLLER_KEY } from '../constants';

/**
 * Class decorator to mark a class as a RabbitMQ controller.
 * When using `scanScope: 'annotated'`, only classes decorated with @RabbitController
 * will be scanned for @RabbitSubscribe and @RabbitRPC decorators.
 *
 * @returns {ClassDecorator} A class decorator that marks the class as a RabbitMQ controller
 *
 * @example
 * ```typescript
 * @Injectable()
 * @RabbitController()
 * class OrderMessageHandler {
 *   @RabbitSubscribe({ queue: 'orders' })
 *   async handleOrder(order: Order): Promise<void> {
 *     await this.processOrder(order);
 *   }
 * }
 * ```
 */
export function RabbitController(): ClassDecorator {
    return SetMetadata(RABBIT_CONTROLLER_KEY, true);
}
