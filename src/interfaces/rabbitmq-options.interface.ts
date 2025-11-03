import type { ModuleMetadata, Type } from '@nestjs/common';

import type { ServiceDiscoveryOptions } from './service-discovery.interface';
import type { Options } from 'amqplib';

/**
 * Connection configuration options
 */
export interface ConnectionOptions {
    /** Connection timeout in milliseconds */
    connectionTimeout?: number;
    /** Heartbeat interval in seconds */
    heartbeatIntervalInSeconds?: number;
    /** Reconnect time in seconds */
    reconnectTimeInSeconds?: number;
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
    /** Exchange name */
    name: string;
    /** Exchange options */
    options?: Options.AssertExchange;
    /** Exchange type: direct, topic, fanout, headers */
    type: 'direct' | 'fanout' | 'headers' | 'topic';
}

/**
 * Publish options
 */
export interface PublishOptions extends Options.Publish {
    /** App ID */
    appId?: string;
    /** Message TTL in milliseconds */
    expiration?: number | string;
    /** Custom headers */
    headers?: any;
    /** Message ID */
    messageId?: string;
    /** Message priority */
    priority?: number;
    /** Message timestamp */
    timestamp?: number;
    /** Message type */
    type?: string;
    /** User ID */
    userId?: string;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
    /** Queue name */
    name: string;
    /** Queue options */
    options?: Options.AssertQueue;
}

/**
 * Async configuration options for RabbitMQ module
 */
export interface RabbitMQModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /** Connection name */
    connectionName?: string;
    /** Dependencies to inject into factory */
    inject?: any[];
    /** Use class to create options */
    useClass?: Type<RabbitMQOptionsFactory>;
    /** Use existing provider */
    useExisting?: Type<RabbitMQOptionsFactory>;
    /** Use factory function */
    useFactory?: (...args: any[]) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

/**
 * RabbitMQ module configuration options
 */
export interface RabbitMQModuleOptions {
    /** Enable auto-reconnect (default: true) */
    autoReconnect?: boolean;
    /** Connection name for multi-connection support */
    connectionName?: string;
    /** Connection options */
    connectionOptions?: ConnectionOptions;
    /** Exchanges to assert on connection */
    exchanges?: ExchangeConfig[];
    /** Prefetch count for consumers (default: 1) */
    prefetchCount?: number;
    /** Queues to assert on connection */
    queues?: QueueConfig[];
    /** Service discovery options */
    serviceDiscovery?: ServiceDiscoveryOptions;
    /** Connection URI (e.g., 'amqp://localhost:5672') */
    uri: string;
}

/**
 * Factory for creating RabbitMQ module options
 */
export interface RabbitMQOptionsFactory {
    createRabbitMQOptions: () => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

/**
 * Subscribe decorator options
 */
export interface RabbitSubscribeOptions {
    /** Connection name (for multi-connection) */
    connectionName?: string;
    /** Consume options */
    consumeOptions?: Options.Consume;
    /** Error handler for this subscriber */
    errorHandler?: (error: Error, message: any) => Promise<void> | void;
    /** Exchange name (optional, can use queue directly) */
    exchange?: string;
    /** Queue name */
    queue: string;
    /** Queue options */
    queueOptions?: Options.AssertQueue;
    /** Routing key for binding */
    routingKey?: string;
    /** Enable RPC mode (auto-reply) */
    rpc?: boolean;
}

/**
 * RPC request options
 */
export interface RpcOptions {
    /** Publish options */
    publishOptions?: PublishOptions;
    /** Timeout in milliseconds */
    timeout?: number;
}
