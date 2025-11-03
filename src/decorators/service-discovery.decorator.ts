import { Inject } from '@nestjs/common';

import { RABBITMQ_SERVICE_DISCOVERY } from '../constants';

/**
 * Decorator to inject ServiceDiscoveryService
 * @example
 * ```typescript
 * class MyService {
 *   constructor(
 *     @InjectServiceDiscovery() private readonly discovery: ServiceDiscoveryService
 *   ) {}
 * }
 * ```
 */
export const InjectServiceDiscovery = (): ParameterDecorator => Inject(RABBITMQ_SERVICE_DISCOVERY);
