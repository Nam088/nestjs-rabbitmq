/**
 * Service discovery event types
 */
export enum ServiceDiscoveryEventType {
    SERVICE_DEREGISTERED = 'service.deregistered',
    SERVICE_HEALTHY = 'service.healthy',
    SERVICE_HEARTBEAT = 'service.heartbeat',
    SERVICE_REGISTERED = 'service.registered',
    SERVICE_UNHEALTHY = 'service.unhealthy',
}

/**
 * Service discovery event
 */
export interface ServiceDiscoveryEvent {
    service: ServiceInfo;
    timestamp: Date;
    type: ServiceDiscoveryEventType;
}

/**
 * Service discovery options
 */
export interface ServiceDiscoveryOptions {
    /**
     * Routing key prefix for service deregistration
     * @default 'service.deregister'
     */
    deregistrationRoutingKey?: string;

    /**
     * Exchange name for service discovery
     * @default 'service.discovery'
     */
    discoveryExchange?: string;

    /**
     * Enable/disable service discovery
     * @default false
     */
    enabled?: boolean;

    /**
     * Health check endpoint
     */
    healthCheckEndpoint?: string;

    /**
     * Heartbeat interval in milliseconds
     * @default 30000 (30 seconds)
     */
    heartbeatInterval?: number;

    /**
     * Routing key prefix for service heartbeat
     * @default 'service.heartbeat'
     */
    heartbeatRoutingKey?: string;

    /**
     * Service host
     */
    host?: string;

    /** Log level for discovery internals */
    logLevel?: 'debug' | 'error' | 'log' | 'none' | 'warn';

    /**
     * Service metadata
     */
    metadata?: Record<string, any>;

    /**
     * Service port
     */
    port?: number;

    /**
     * Routing key prefix for service registration
     * @default 'service.register'
     */
    registrationRoutingKey?: string;

    /**
     * Service name to register
     */
    serviceName?: string;

    /**
     * Service timeout in milliseconds (considered dead if no heartbeat)
     * @default 90000 (90 seconds)
     */
    serviceTimeout?: number;

    /**
     * Service tags
     */
    tags?: string[];

    /**
     * Service version
     */
    version?: string;
}

/**
 * Service filter options
 */
export interface ServiceFilterOptions {
    /**
     * Filter by metadata
     */
    metadata?: Record<string, any>;

    /**
     * Filter by service name
     */
    serviceName?: string;

    /**
     * Filter by status
     */
    status?: 'healthy' | 'unhealthy' | 'unknown';

    /**
     * Filter by tags
     */
    tags?: string[];

    /**
     * Filter by version
     */
    version?: string;
}

/**
 * Service information stored in RabbitMQ
 */
export interface ServiceInfo {
    /**
     * Service health check endpoint
     */
    healthCheckEndpoint?: string;

    /**
     * Host where service is running
     */
    host: string;

    /**
     * Last heartbeat timestamp
     */
    lastHeartbeat: Date;

    /**
     * Service metadata
     */
    metadata?: Record<string, any>;

    /**
     * Port of the service
     */
    port?: number;

    /**
     * Timestamp when service was registered
     */
    registeredAt: Date;

    /**
     * Unique service identifier
     */
    serviceId: string;

    /**
     * Service name
     */
    serviceName: string;

    /**
     * Service status
     */
    status: 'healthy' | 'unhealthy' | 'unknown';

    /**
     * Service tags for filtering
     */
    tags?: string[];

    /**
     * Service version
     */
    version: string;
}
