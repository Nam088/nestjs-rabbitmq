import { SetMetadata } from '@nestjs/common';

import { RABBITMQ_SUBSCRIBE_METADATA } from '../constants';

import type { RabbitSubscribeOptions } from '../interfaces/rabbitmq-options.interface';

/**
 * Decorator to mark a method as a RabbitMQ message handler
 * @param options - Subscribe options
 */
export const RabbitSubscribe = (options: RabbitSubscribeOptions) => SetMetadata(RABBITMQ_SUBSCRIBE_METADATA, options);
