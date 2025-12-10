import { SetMetadata } from '@nestjs/common';

import { RABBIT_RPC_METADATA } from '../constants';

import type { RabbitRPCOptions } from '../interfaces/rabbitmq-options.interface';

/**
 * Decorator to mark a method as a RabbitMQ RPC handler (request-reply pattern).
 * The decorated method will receive RPC requests and its return value will be sent back as the response.
 *
 * @param {RabbitRPCOptions} options - RPC configuration options
 * @returns {MethodDecorator} A method decorator that sets RabbitMQ RPC metadata
 *
 * @example
 * ```typescript
 * class CalculatorService {
 *   @RabbitRPC({
 *     queue: 'calculator-rpc',
 *     prefetchCount: 5,
 *   })
 *   async calculate(request: { a: number; b: number }): Promise<{ result: number }> {
 *     return { result: request.a + request.b };
 *   }
 * }
 * ```
 */
export const RabbitRPC = (options: RabbitRPCOptions): MethodDecorator => SetMetadata(RABBIT_RPC_METADATA, options);
