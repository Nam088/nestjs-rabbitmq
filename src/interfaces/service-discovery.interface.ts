/**
 * @fileoverview Service discovery interfaces.
 * Defines types for the decentralized service registry feature.
 */

/**
 * Types of service discovery events that can be published/received.
 */
export enum ServiceDiscoveryEventType {
    /** Service has been removed from the registry */
    SERVICE_DEREGISTERED = 'service.deregistered',

    /** Service has become healthy */
    SERVICE_HEALTHY = 'service.healthy',

    /** Periodic heartbeat to indicate service is alive */
    SERVICE_HEARTBEAT = 'service.heartbeat',

    /** New service has registered */
    SERVICE_REGISTERED = 'service.registered',

    /** Service has become unhealthy */
    SERVICE_UNHEALTHY = 'service.unhealthy',
}

/**
 * Event structure for service discovery messages.
 *
 * @example
 * ```typescript
 * const event: ServiceDiscoveryEvent = {
 *   type: ServiceDiscoveryEventType.SERVICE_REGISTERED,
 *   service: {
 *     serviceId: 'abc-123',
 *     serviceName: 'order-service',
 *     host: 'localhost',
 *     port: 3000,
 *     status: 'healthy',
 *     // ...
 *   },
 *   timestamp: new Date(),
 * };
 * ```
 */
export interface ServiceDiscoveryEvent {
    /** The service information */
    service: ServiceInfo;

    /** When the event occurred */
    timestamp: Date;

    /** Type of discovery event */
    type: ServiceDiscoveryEventType;
}

/**
 * Configuration options for service discovery.
 *
 * @example
 * ```typescript
 * const options: ServiceDiscoveryOptions = {
 *   enabled: true,
 *   serviceName: 'order-service',
 *   version: '2.0.0',
 *   port: 3000,
 *   tags: ['api', 'production'],
 *   metadata: { region: 'us-east-1' },
 *   heartbeatInterval: 30000,
 *   serviceTimeout: 90000,
 * };
 * ```
 */
export interface ServiceDiscoveryOptions {
    /**
     * Routing key for service deregistration events.
     * @default 'service.deregister'
     */
    deregistrationRoutingKey?: string;

    /**
     * Exchange name for service discovery messages.
     * @default 'service.discovery'
     */
    discoveryExchange?: string;

    /**
     * Enable or disable service discovery.
     * When disabled, the service will not register or participate in discovery.
     * @default false
     */
    enabled?: boolean;

    /**
     * Health check endpoint path.
     * Other services can use this to verify health.
     * @example '/health'
     */
    healthCheckEndpoint?: string;

    /**
     * Interval between heartbeat messages in milliseconds.
     * @default 30000 (30 seconds)
     */
    heartbeatInterval?: number;

    /**
     * Routing key for heartbeat events.
     * @default 'service.heartbeat'
     */
    heartbeatRoutingKey?: string;

    /**
     * Host address where this service is accessible.
     * @default os.hostname()
     */
    host?: string;

    /**
     * Log level for service discovery internals.
     * @default 'error'
     */
    logLevel?: 'debug' | 'error' | 'log' | 'none' | 'warn';

    /**
     * Custom metadata to include with service registration.
     * Can be used for filtering or routing decisions.
     *
     * @example
     * ```typescript
     * metadata: {
     *   region: 'us-east-1',
     *   environment: 'production',
     *   capabilities: ['payments', 'refunds'],
     * }
     * ```
     */
    metadata?: Record<string, unknown>;

    /**
     * Port number where this service is accessible.
     */
    port?: number;

    /**
     * Routing key for service registration events.
     * @default 'service.register'
     */
    registrationRoutingKey?: string;

    /**
     * Name to register this service as.
     * Used by other services to discover this service.
     */
    serviceName?: string;

    /**
     * Time in milliseconds after which a service is considered dead
     * if no heartbeat is received.
     * @default 90000 (90 seconds)
     */
    serviceTimeout?: number;

    /**
     * Tags for categorizing and filtering services.
     *
     * @example
     * ```typescript
     * tags: ['api', 'production', 'v2']
     * ```
     */
    tags?: string[];

    /**
     * Version string for this service.
     * Can be used for routing to specific versions.
     * @default '1.0.0'
     */
    version?: string;
}

/**
 * Options for filtering services when querying the registry.
 *
 * @example
 * ```typescript
 * const services = discovery.getServices({
 *   serviceName: 'user-service',
 *   status: 'healthy',
 *   version: '2.0.0',
 *   tags: ['production'],
 *   metadata: { region: 'us-east-1' },
 * });
 * ```
 */
export interface ServiceFilterOptions {
    /**
     * Filter by matching metadata key-value pairs.
     * All specified pairs must match.
     */
    metadata?: Record<string, unknown>;

    /** Filter by exact service name match */
    serviceName?: string;

    /** Filter by service health status */
    status?: 'healthy' | 'unhealthy' | 'unknown';

    /**
     * Filter by tags.
     * Services matching ANY of the specified tags will be included.
     */
    tags?: string[];

    /** Filter by exact version match */
    version?: string;
}

/**
 * Information about a registered service.
 * This structure is stored in the service registry and exchanged in discovery events.
 *
 * @example
 * ```typescript
 * const service: ServiceInfo = {
 *   serviceId: 'abc-123-def',
 *   serviceName: 'order-service',
 *   host: '192.168.1.100',
 *   port: 3000,
 *   version: '2.0.0',
 *   status: 'healthy',
 *   tags: ['api', 'production'],
 *   metadata: { region: 'us-east-1' },
 *   registeredAt: new Date('2024-01-01T00:00:00Z'),
 *   lastHeartbeat: new Date('2024-01-01T00:01:00Z'),
 *   healthCheckEndpoint: '/health',
 * };
 * ```
 */
export interface ServiceInfo {
    /**
     * Health check endpoint path for verifying service health.
     */
    healthCheckEndpoint?: string;

    /**
     * Host address where the service is running.
     */
    host: string;

    /**
     * Timestamp of the last heartbeat received from this service.
     * Used to determine if the service is still alive.
     */
    lastHeartbeat: Date;

    /**
     * Custom metadata associated with this service.
     */
    metadata?: Record<string, unknown>;

    /**
     * Port number where the service is accessible.
     */
    port?: number;

    /**
     * Timestamp when this service was first registered.
     */
    registeredAt: Date;

    /**
     * Unique identifier for this service instance.
     * Generated automatically using UUID.
     */
    serviceId: string;

    /**
     * Logical name of the service.
     * Multiple instances can share the same service name.
     */
    serviceName: string;

    /**
     * Current health status of the service.
     * - `healthy`: Service is responding to heartbeats
     * - `unhealthy`: Service has missed some heartbeats
     * - `unknown`: Service status cannot be determined
     */
    status: 'healthy' | 'unhealthy' | 'unknown';

    /**
     * Tags for categorizing and filtering.
     */
    tags?: string[];

    /**
     * Version of the service.
     */
    version: string;
}
