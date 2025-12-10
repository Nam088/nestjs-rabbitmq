import { randomUUID } from 'crypto';
import { hostname } from 'os';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import {
    ServiceDiscoveryEvent,
    ServiceDiscoveryEventType,
    ServiceDiscoveryOptions,
    ServiceFilterOptions,
    ServiceInfo,
} from '../interfaces/service-discovery.interface';
import { LogLevel, shouldLog } from '../utils/log-utils';

import { RabbitMQService } from './rabbitmq.service';

/**
 * Service Discovery Service using RabbitMQ.
 * Provides a decentralized service registry where services can:
 * - Register themselves on startup
 * - Send periodic heartbeats to indicate health
 * - Discover other registered services
 * - Detect and remove dead services
 *
 * @example
 * ```typescript
 * @Injectable()
 * class ApiGateway {
 *   constructor(
 *     @InjectServiceDiscovery() private readonly discovery: ServiceDiscoveryService,
 *   ) {}
 *
 *   async getBackendUrl(): Promise<string> {
 *     const service = this.discovery.getRandomHealthyService('backend-api');
 *     if (!service) {
 *       throw new Error('No healthy backend available');
 *     }
 *     return `http://${service.host}:${service.port}`;
 *   }
 * }
 * ```
 */
@Injectable()
export class ServiceDiscoveryService implements OnModuleDestroy, OnModuleInit {
    private cleanupInterval?: NodeJS.Timeout;
    private heartbeatInterval?: NodeJS.Timeout;
    private isRegistered = false;
    private readonly logger = new Logger(ServiceDiscoveryService.name);
    private readonly logLevel: LogLevel;
    private readonly services = new Map<string, ServiceInfo>();
    private serviceId: string;

    /**
     * Creates an instance of ServiceDiscoveryService.
     *
     * @param {RabbitMQService} rabbitMQService - The RabbitMQ service for messaging
     * @param {ServiceDiscoveryOptions} options - Configuration options for service discovery
     */
    constructor(
        private readonly rabbitMQService: RabbitMQService,
        private readonly options: ServiceDiscoveryOptions,
    ) {
        this.serviceId = randomUUID();
        this.logLevel = options.logLevel ?? 'error';
    }

    /**
     * NestJS lifecycle hook called when the module is being destroyed.
     * Deregisters the service and stops heartbeat/cleanup intervals.
     *
     * @returns {Promise<void>}
     */
    async onModuleDestroy(): Promise<void> {
        if (!this.options.enabled || !this.isRegistered) {
            return;
        }

        try {
            await this.deregisterService();
            this.stopHeartbeat();
            this.stopCleanup();
        } catch (error) {
            this.logger.error('Failed to cleanup service discovery', error);
        }
    }

    /**
     * NestJS lifecycle hook called when the module is initialized.
     * Sets up the discovery exchange, registers the service, and starts heartbeat.
     *
     * @returns {Promise<void>}
     */
    async onModuleInit(): Promise<void> {
        if (!this.options.enabled) {
            return;
        }

        try {
            await this.setupDiscovery();
            await this.registerService();
            this.startHeartbeat();
            this.startCleanup();
        } catch (error) {
            this.logger.error('Failed to initialize service discovery', error);
        }
    }

    /**
     * Gets all registered services in the registry.
     *
     * @returns {ServiceInfo[]} Array of all registered services
     *
     * @example
     * ```typescript
     * const allServices = discovery.getAllServices();
     * console.log(`Total services: ${allServices.length}`);
     * ```
     */
    getAllServices(): ServiceInfo[] {
        return Array.from(this.services.values());
    }

    /**
     * Gets the current service's information.
     *
     * @private
     * @returns {ServiceInfo} The current service info
     */
    private getCurrentServiceInfo(): ServiceInfo {
        return {
            status: 'healthy',
            healthCheckEndpoint: this.options.healthCheckEndpoint,
            host: this.options.host || hostname(),
            lastHeartbeat: new Date(),
            metadata: this.options.metadata || {},
            port: this.options.port,
            registeredAt: new Date(),
            serviceName: this.options.serviceName || 'unknown',
            tags: this.options.tags || [],
            version: this.options.version || '1.0.0',
            serviceId: this.serviceId,
        };
    }

    /**
     * Gets the exchange name for service discovery events.
     *
     * @private
     * @returns {string} The exchange name
     */
    private getExchangeName(): string {
        return this.options.discoveryExchange || 'service.discovery';
    }

    /**
     * Gets all healthy services, optionally filtered by service name.
     *
     * @param {string} [serviceName] - Optional service name to filter by
     * @returns {ServiceInfo[]} Array of healthy services
     *
     * @example
     * ```typescript
     * // Get all healthy services
     * const healthy = discovery.getHealthyServices();
     *
     * // Get healthy instances of a specific service
     * const backends = discovery.getHealthyServices('backend-api');
     * ```
     */
    getHealthyServices(serviceName?: string): ServiceInfo[] {
        return this.getServices({
            status: 'healthy',
            serviceName,
        });
    }

    /**
     * Gets a random healthy service instance (for client-side load balancing).
     *
     * @param {string} serviceName - The name of the service to find
     * @returns {ServiceInfo | undefined} A random healthy service instance, or undefined if none available
     *
     * @example
     * ```typescript
     * const backend = discovery.getRandomHealthyService('backend-api');
     * if (backend) {
     *   const url = `http://${backend.host}:${backend.port}/api`;
     *   // Make request to url
     * }
     * ```
     */
    getRandomHealthyService(serviceName: string): ServiceInfo | undefined {
        const services = this.getHealthyServices(serviceName);

        if (services.length === 0) {
            return undefined;
        }

        return services[Math.floor(Math.random() * services.length)];
    }

    /**
     * Gets the routing key for a specific event type.
     *
     * @private
     * @param {ServiceDiscoveryEventType} type - The event type
     * @returns {string} The routing key
     */
    private getRoutingKey(type: ServiceDiscoveryEventType): string {
        switch (type) {
            case ServiceDiscoveryEventType.SERVICE_DEREGISTERED:
                return this.options.deregistrationRoutingKey || 'service.deregister';

            case ServiceDiscoveryEventType.SERVICE_HEARTBEAT:
                return this.options.heartbeatRoutingKey || 'service.heartbeat';

            case ServiceDiscoveryEventType.SERVICE_REGISTERED:
                return this.options.registrationRoutingKey || 'service.register';

            default:
                return 'service.unknown';
        }
    }

    /**
     * Gets a service by its unique ID.
     *
     * @param {string} serviceId - The service ID to look up
     * @returns {ServiceInfo | undefined} The service info, or undefined if not found
     *
     * @example
     * ```typescript
     * const service = discovery.getServiceById('abc-123-def');
     * if (service) {
     *   console.log(`Found: ${service.serviceName}`);
     * }
     * ```
     */
    getServiceById(serviceId: string): ServiceInfo | undefined {
        return this.services.get(serviceId);
    }

    /**
     * Gets the count of registered services, optionally filtered by name.
     *
     * @param {string} [serviceName] - Optional service name to count
     * @returns {number} The number of matching services
     *
     * @example
     * ```typescript
     * const totalCount = discovery.getServiceCount();
     * const backendCount = discovery.getServiceCount('backend-api');
     * ```
     */
    getServiceCount(serviceName?: string): number {
        if (serviceName) {
            return this.getServices({ serviceName }).length;
        }

        return this.services.size;
    }

    /**
     * Gets services matching the specified filter criteria.
     *
     * @param {ServiceFilterOptions} [filter] - Optional filter options
     * @returns {ServiceInfo[]} Array of matching services
     *
     * @example
     * ```typescript
     * // Get services by multiple criteria
     * const services = discovery.getServices({
     *   serviceName: 'api',
     *   status: 'healthy',
     *   tags: ['production'],
     *   version: '2.0.0',
     *   metadata: { region: 'us-east-1' },
     * });
     * ```
     */
    getServices(filter?: ServiceFilterOptions): ServiceInfo[] {
        let services = this.getAllServices();

        if (!filter) {
            return services;
        }

        if (filter.serviceName) {
            services = services.filter((s) => s.serviceName === filter.serviceName);
        }

        if (filter.version) {
            services = services.filter((s) => s.version === filter.version);
        }

        if (filter.status) {
            services = services.filter((s) => s.status === filter.status);
        }

        if (filter.tags && filter.tags.length > 0) {
            services = services.filter((s) => filter.tags!.some((tag) => s.tags?.includes(tag)));
        }

        if (filter.metadata) {
            services = services.filter((s) => {
                if (!s.metadata) return false;

                return Object.entries(filter.metadata!).every(([key, value]) => s.metadata![key] === value);
            });
        }

        return services;
    }

    /**
     * Sets up the service discovery exchange and queue.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async setupDiscovery(): Promise<void> {
        const exchange = this.getExchangeName();

        // Assert exchange
        await this.rabbitMQService.assertExchange(exchange, 'topic', {
            durable: true,
        });

        // Subscribe to all service discovery events
        // Using clear prefix to avoid collision with user queues
        const queue = `__nestjs_rabbitmq_sd__.${this.serviceId}`;

        await this.rabbitMQService.assertQueue(queue, { autoDelete: true, exclusive: true });
        await this.rabbitMQService.bindQueue(queue, exchange, '*');
        await this.rabbitMQService.consume(queue, this.handleServiceEvent.bind(this));

        this.info('Service discovery setup completed');
    }

    /**
     * Publishes a service discovery event.
     *
     * @private
     * @param {ServiceDiscoveryEventType} type - The event type
     * @param {ServiceInfo} service - The service information
     * @returns {Promise<void>}
     */
    private async publishServiceEvent(type: ServiceDiscoveryEventType, service: ServiceInfo): Promise<void> {
        const exchange = this.getExchangeName();
        const routingKey = this.getRoutingKey(type);

        const event: ServiceDiscoveryEvent = {
            type,
            service,
            timestamp: new Date(),
        };

        await this.rabbitMQService.publish(exchange, routingKey, event);
    }

    /**
     * Checks if a service with the given name exists in the registry.
     *
     * @param {string} serviceName - The service name to check
     * @returns {boolean} True if at least one service with that name exists
     *
     * @example
     * ```typescript
     * if (discovery.hasService('payment-service')) {
     *   // Payment service is available
     * }
     * ```
     */
    hasService(serviceName: string): boolean {
        return this.getServices({ serviceName }).length > 0;
    }

    /**
     * Cleans up services that have not sent a heartbeat within the timeout period.
     *
     * @private
     */
    private cleanupDeadServices(): void {
        const timeout = this.options.serviceTimeout || 90000;
        const now = new Date();

        for (const [serviceId, service] of this.services.entries()) {
            const timeSinceLastHeartbeat = now.getTime() - service.lastHeartbeat.getTime();

            if (timeSinceLastHeartbeat > timeout) {
                this.warn(`Service ${service.serviceName} (${serviceId}) is considered dead, removing...`);
                this.services.delete(serviceId);
            } else if (timeSinceLastHeartbeat > timeout / 2 && service.status === 'healthy') {
                service.status = 'unhealthy';
                this.warn(`Service ${service.serviceName} (${serviceId}) marked as unhealthy`);
            }
        }
    }

    /**
     * Logs a debug message.
     * @private
     */
    private debug(message: string): void {
        if (shouldLog('debug', this.logLevel)) this.logger.debug(message);
    }

    /**
     * Deregisters this service from the registry.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async deregisterService(): Promise<void> {
        const serviceInfo = this.services.get(this.serviceId);

        if (!serviceInfo) {
            return;
        }

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_DEREGISTERED, serviceInfo);

        this.services.delete(this.serviceId);
        this.isRegistered = false;

        this.info(`Service deregistered: ${serviceInfo.serviceName} (${this.serviceId})`);
    }

    /**
     * Handles incoming service discovery events.
     *
     * @private
     * @param {ServiceDiscoveryEvent} event - The received event
     */
    private handleServiceEvent(event: ServiceDiscoveryEvent): void {
        const { type, service } = event;

        // Ignore events from this service
        if (service.serviceId === this.serviceId) {
            return;
        }

        switch (type) {
            case ServiceDiscoveryEventType.SERVICE_DEREGISTERED: {
                this.services.delete(service.serviceId);
                this.info(`Service removed: ${service.serviceName} (${service.serviceId})`);
                break;
            }

            case ServiceDiscoveryEventType.SERVICE_HEARTBEAT: {
                const existingService = this.services.get(service.serviceId);

                if (existingService) {
                    existingService.lastHeartbeat = service.lastHeartbeat;
                    existingService.status = service.status;
                } else {
                    this.services.set(service.serviceId, service);
                }

                break;
            }

            case ServiceDiscoveryEventType.SERVICE_REGISTERED:
                this.services.set(service.serviceId, service);
                this.info(`Service discovered: ${service.serviceName} (${service.serviceId})`);
                break;
        }
    }

    /**
     * Logs an info message.
     * @private
     */
    private info(message: string): void {
        if (shouldLog('log', this.logLevel)) this.logger.log(message);
    }

    /**
     * Registers this service in the registry.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async registerService(): Promise<void> {
        const serviceInfo = this.getCurrentServiceInfo();

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_REGISTERED, serviceInfo);

        this.services.set(this.serviceId, serviceInfo);
        this.isRegistered = true;

        this.info(`Service registered: ${serviceInfo.serviceName} (${this.serviceId})`);
    }

    /**
     * Sends a heartbeat to indicate this service is still alive.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async sendHeartbeat(): Promise<void> {
        const serviceInfo = this.services.get(this.serviceId);

        if (!serviceInfo) {
            return;
        }

        serviceInfo.lastHeartbeat = new Date();
        serviceInfo.status = 'healthy';

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_HEARTBEAT, serviceInfo);
    }

    /**
     * Starts the cleanup interval to remove dead services.
     *
     * @private
     */
    private startCleanup(): void {
        const interval = (this.options.heartbeatInterval || 30000) * 2;

        this.cleanupInterval = setInterval(() => {
            this.cleanupDeadServices();
        }, interval);

        this.debug(`Cleanup started with interval: ${interval}ms`);
    }

    /**
     * Starts the heartbeat interval.
     *
     * @private
     */
    private startHeartbeat(): void {
        const interval = this.options.heartbeatInterval || 30000;

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat().catch((error) => {
                this.logger.error('Failed to send heartbeat', error);
            });
        }, interval);

        this.debug(`Heartbeat started with interval: ${interval}ms`);
    }

    /**
     * Stops the cleanup interval.
     *
     * @private
     */
    private stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }

    /**
     * Stops the heartbeat interval.
     *
     * @private
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }
    }

    /**
     * Logs a warning message.
     * @private
     */
    private warn(message: string): void {
        if (shouldLog('warn', this.logLevel)) this.logger.warn(message);
    }
}
