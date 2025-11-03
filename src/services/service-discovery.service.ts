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

import { RabbitMQService } from './rabbitmq.service';

/**
 * Service Discovery Service using RabbitMQ
 */
@Injectable()
export class ServiceDiscoveryService implements OnModuleDestroy, OnModuleInit {
    private cleanupInterval?: NodeJS.Timeout;
    private heartbeatInterval?: NodeJS.Timeout;
    private isRegistered = false;
    private readonly logger = new Logger(ServiceDiscoveryService.name);
    private readonly services = new Map<string, ServiceInfo>();
    private serviceId: string;

    constructor(
        private readonly rabbitMQService: RabbitMQService,
        private readonly options: ServiceDiscoveryOptions,
    ) {
        this.serviceId = randomUUID();
    }

    async onModuleDestroy() {
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

    async onModuleInit() {
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
     * Get all registered services
     */
    getAllServices(): ServiceInfo[] {
        return Array.from(this.services.values());
    }

    /**
     * Get current service info
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
     * Get exchange name
     */
    private getExchangeName(): string {
        return this.options.discoveryExchange || 'service.discovery';
    }

    /**
     * Get healthy services
     */
    getHealthyServices(serviceName?: string): ServiceInfo[] {
        return this.getServices({
            status: 'healthy',
            serviceName,
        });
    }

    /**
     * Get a random healthy service instance (for load balancing)
     */
    getRandomHealthyService(serviceName: string): ServiceInfo | undefined {
        const services = this.getHealthyServices(serviceName);

        if (services.length === 0) {
            return undefined;
        }

        return services[Math.floor(Math.random() * services.length)];
    }

    /**
     * Get routing key based on event type
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
     * Get service by ID
     */
    getServiceById(serviceId: string): ServiceInfo | undefined {
        return this.services.get(serviceId);
    }

    /**
     * Get service count
     */
    getServiceCount(serviceName?: string): number {
        if (serviceName) {
            return this.getServices({ serviceName }).length;
        }

        return this.services.size;
    }

    /**
     * Get services by filter
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
     * Setup service discovery exchange and queues
     */
    private async setupDiscovery(): Promise<void> {
        const exchange = this.getExchangeName();

        // Assert exchange
        await this.rabbitMQService.assertExchange(exchange, 'topic', {
            durable: true,
        });

        // Subscribe to all service discovery events
        const queue = `service.discovery.${this.serviceId}`;

        await this.rabbitMQService.assertQueue(queue, { autoDelete: true, exclusive: true });
        await this.rabbitMQService.bindQueue(queue, exchange, '*');
        await this.rabbitMQService.consume(queue, this.handleServiceEvent.bind(this));

        this.logger.log('Service discovery setup completed');
    }

    /**
     * Publish service discovery event
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
     * Check if service exists
     */
    hasService(serviceName: string): boolean {
        return this.getServices({ serviceName }).length > 0;
    }

    /**
     * Cleanup dead services
     */
    private cleanupDeadServices(): void {
        const timeout = this.options.serviceTimeout || 90000;
        const now = new Date();

        for (const [serviceId, service] of this.services.entries()) {
            const timeSinceLastHeartbeat = now.getTime() - service.lastHeartbeat.getTime();

            if (timeSinceLastHeartbeat > timeout) {
                this.logger.warn(`Service ${service.serviceName} (${serviceId}) is considered dead, removing...`);
                this.services.delete(serviceId);
            } else if (timeSinceLastHeartbeat > timeout / 2 && service.status === 'healthy') {
                service.status = 'unhealthy';
                this.logger.warn(`Service ${service.serviceName} (${serviceId}) marked as unhealthy`);
            }
        }
    }

    /**
     * Deregister this service
     */
    private async deregisterService(): Promise<void> {
        const serviceInfo = this.services.get(this.serviceId);

        if (!serviceInfo) {
            return;
        }

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_DEREGISTERED, serviceInfo);

        this.services.delete(this.serviceId);
        this.isRegistered = false;

        this.logger.log(`Service deregistered: ${serviceInfo.serviceName} (${this.serviceId})`);
    }

    /**
     * Handle service discovery events
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
                this.logger.log(`Service removed: ${service.serviceName} (${service.serviceId})`);
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
                this.logger.log(`Service discovered: ${service.serviceName} (${service.serviceId})`);
                break;
        }
    }

    /**
     * Register this service
     */
    private async registerService(): Promise<void> {
        const serviceInfo = this.getCurrentServiceInfo();

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_REGISTERED, serviceInfo);

        this.services.set(this.serviceId, serviceInfo);
        this.isRegistered = true;

        this.logger.log(`Service registered: ${serviceInfo.serviceName} (${this.serviceId})`);
    }

    /**
     * Send heartbeat
     */
    private async sendHeartbeat(): Promise<void> {
        const serviceInfo = this.services.get(this.serviceId);

        if (!serviceInfo) {
            return;
        }

        serviceInfo.lastHeartbeat = new Date();
        serviceInfo.status = 'healthy';

        await this.publishServiceEvent(ServiceDiscoveryEventType.SERVICE_HEARTBEAT, serviceInfo);

        this.logger.debug(`Heartbeat sent for service: ${serviceInfo.serviceName}`);
    }

    /**
     * Start cleanup interval for dead services
     */
    private startCleanup(): void {
        const interval = (this.options.heartbeatInterval || 30000) * 2;

        this.cleanupInterval = setInterval(() => {
            this.cleanupDeadServices();
        }, interval);

        this.logger.log(`Cleanup started with interval: ${interval}ms`);
    }

    /**
     * Start heartbeat interval
     */
    private startHeartbeat(): void {
        const interval = this.options.heartbeatInterval || 30000;

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat().catch((error) => {
                this.logger.error('Failed to send heartbeat', error);
            });
        }, interval);

        this.logger.log(`Heartbeat started with interval: ${interval}ms`);
    }

    /**
     * Stop cleanup interval
     */
    private stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }

    /**
     * Stop heartbeat interval
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }
    }
}
