import { Inject } from '@nestjs/common';

import { DEFAULT_CONNECTION_NAME, RABBITMQ_SERVICE_DISCOVERY } from '../constants';

/**
 * Parameter decorator to inject the ServiceDiscoveryService instance.
 * Use this decorator to access service discovery features for microservice communication.
 *
 * @param {string} [connectionName='default'] - The name of the RabbitMQ connection to use
 * @returns {ParameterDecorator} A parameter decorator that injects the service discovery service
 *
 * @example
 * ```typescript
 * @Injectable()
 * class ApiGateway {
 *   constructor(
 *     @InjectServiceDiscovery() private readonly discovery: ServiceDiscoveryService,
 *   ) {}
 *
 *   async getAvailableServices(): Promise<ServiceInfo[]> {
 *     return this.discovery.getHealthyServices('user-service');
 *   }
 *
 *   async getServiceEndpoint(serviceName: string): Promise<string | undefined> {
 *     const service = this.discovery.getRandomHealthyService(serviceName);
 *     return service ? `http://${service.host}:${service.port}` : undefined;
 *   }
 * }
 * ```
 */
export const InjectServiceDiscovery = (connectionName: string = DEFAULT_CONNECTION_NAME): ParameterDecorator =>
    Inject(`${RABBITMQ_SERVICE_DISCOVERY}_${connectionName}`);
