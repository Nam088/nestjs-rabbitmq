/**
 * @fileoverview RabbitMQ module configuration interfaces.
 * Defines all options for configuring the RabbitMQ module, connections,
 * exchanges, queues, and message handling.
 */

import type { ModuleMetadata, Type } from '@nestjs/common';

import type { ServiceDiscoveryOptions } from './service-discovery.interface';
import type { Options } from 'amqplib';

/**
 * Connection configuration options for RabbitMQ.
 *
 * @example
 * ```typescript
 * const connectionOptions: ConnectionOptions = {
 *   connectionTimeout: 10000,
 *   heartbeatIntervalInSeconds: 30,
 *   reconnectTimeInSeconds: 5,
 * };
 * ```
 */
export interface ConnectionOptions {
    /**
     * Connection timeout in milliseconds.
     * @default undefined (uses amqplib default)
     */
    connectionTimeout?: number;

    /**
     * Heartbeat interval in seconds.
     * Used to detect dead connections.
     * @default undefined (uses amqplib default)
     */
    heartbeatIntervalInSeconds?: number;

    /**
     * Reconnect time in seconds.
     * Time to wait before attempting to reconnect after connection loss.
     * @default undefined (uses amqp-connection-manager default)
     */
    reconnectTimeInSeconds?: number;
}

/**
 * Configuration for asserting an exchange on startup.
 *
 * @example
 * ```typescript
 * const exchange: ExchangeConfig = {
 *   name: 'events',
 *   type: 'topic',
 *   options: { durable: true, autoDelete: false },
 * };
 * ```
 */
export interface ExchangeConfig {
    /** Exchange name */
    name: string;

    /** Exchange options passed to assertExchange */
    options?: Options.AssertExchange;

    /**
     * Exchange type.
     * - `direct`: Route by exact routing key match
     * - `topic`: Route by pattern matching (*.logs, user.#)
     * - `fanout`: Broadcast to all bound queues
     * - `headers`: Route based on message headers
     */
    type: 'direct' | 'fanout' | 'headers' | 'topic';
}

/**
 * Options for publishing messages, extends amqplib's Publish options.
 *
 * @example
 * ```typescript
 * const options: PublishOptions = {
 *   persistent: true,
 *   priority: 5,
 *   expiration: '60000',
 *   messageId: 'msg-123',
 *   headers: { 'x-retry-count': 0 },
 * };
 * ```
 */
export interface PublishOptions extends Options.Publish {
    /** Application ID for message tracking */
    appId?: string;

    /**
     * Message TTL (time-to-live) in milliseconds.
     * Message will be discarded after this time.
     */
    expiration?: number | string;

    /** Custom headers to include with the message */
    headers?: Record<string, unknown>;

    /** Unique message identifier */
    messageId?: string;

    /**
     * Message priority (0-255).
     * Higher values = higher priority.
     */
    priority?: number;

    /** Unix timestamp when message was created */
    timestamp?: number;

    /** Application-specific message type */
    type?: string;

    /** User ID for the message sender */
    userId?: string;
}

/**
 * Configuration for asserting a queue on startup.
 *
 * @example
 * ```typescript
 * const queue: QueueConfig = {
 *   name: 'orders',
 *   options: { durable: true, deadLetterExchange: 'dlx' },
 * };
 * ```
 */
export interface QueueConfig {
    /** Queue name */
    name: string;

    /** Queue options passed to assertQueue */
    options?: Options.AssertQueue;
}

/**
 * Options for the `@RabbitHandler` decorator.
 * Configures how a method handles incoming RabbitMQ messages.
 *
 * @example
 * ```typescript
 * @RabbitHandler({
 *   queue: 'notifications',
 *   exchange: 'events',
 *   routingKey: 'user.*',
 *   prefetchCount: 5,
 * })
 * async handleNotification(message: NotificationPayload): Promise<void> {
 *   // Handle message
 * }
 * ```
 */
export interface RabbitHandlerOptions {
    /**
     * Connection name for multi-connection setups.
     * @default 'default'
     */
    connectionName?: string;

    /** Consume options passed to channel.consume() */
    consumeOptions?: Options.Consume;

    /** Exchange name (optional, can use queue directly) */
    exchange?: string;

    /**
     * Disable automatic message acknowledgment.
     * When true, messages must be manually acknowledged.
     * @default false
     */
    noAck?: boolean;

    /**
     * Number of messages to prefetch.
     * Controls how many unacknowledged messages can be held.
     * @default 1
     */
    prefetchCount?: number;

    /** Queue name to consume from */
    queue?: string;

    /** Queue options if the queue needs to be asserted */
    queueOptions?: Options.AssertQueue;

    /** Routing key pattern for binding queue to exchange */
    routingKey?: string;
}

/**
 * Async configuration options for RabbitMQ module.
 * Use with `RabbitMQModule.forRootAsync()` for dynamic configuration.
 *
 * @example
 * ```typescript
 * // Using factory function
 * RabbitMQModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     uri: config.get('RABBITMQ_URI'),
 *   }),
 * })
 *
 * // Using class
 * RabbitMQModule.forRootAsync({
 *   useClass: RabbitMQConfigService,
 * })
 * ```
 */
export interface RabbitMQModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Connection name for multi-connection setups.
     * @default 'default'
     */
    connectionName?: string;

    /** Dependencies to inject into the factory function */
    inject?: any[];

    /** Class that implements RabbitMQOptionsFactory */
    useClass?: Type<RabbitMQOptionsFactory>;

    /** Existing provider that implements RabbitMQOptionsFactory */
    useExisting?: Type<RabbitMQOptionsFactory>;

    /** Factory function to create options */
    useFactory?: (...args: any[]) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

/**
 * Main configuration options for the RabbitMQ module.
 *
 * @example
 * ```typescript
 * const options: RabbitMQModuleOptions = {
 *   uri: 'amqp://guest:guest@localhost:5672',
 *   exchanges: [
 *     { name: 'events', type: 'topic' },
 *   ],
 *   queues: [
 *     { name: 'orders', options: { durable: true } },
 *   ],
 *   serviceDiscovery: {
 *     enabled: true,
 *     serviceName: 'order-service',
 *   },
 * };
 * ```
 */
export interface RabbitMQModuleOptions {
    /**
     * Enable auto discovery of @RabbitSubscribe and @RabbitRPC decorators.
     * @default true
     */
    autoDiscover?: boolean;

    /**
     * Enable automatic reconnection on connection loss.
     * @default true
     */
    autoReconnect?: boolean;

    /**
     * Connection name for multi-connection support.
     * @default 'default'
     */
    connectionName?: string;

    /** Connection-level options */
    connectionOptions?: ConnectionOptions;

    /** Exchanges to assert when the module initializes */
    exchanges?: ExchangeConfig[];

    /** Provider classes to exclude from decorator discovery */
    excludeProviders?: Array<string | symbol | Type>;

    /** Limit discovery to these specific modules */
    includeModules?: Array<string | Type>;

    /** Limit discovery to these specific providers */
    includeProviders?: Array<string | symbol | Type>;

    /**
     * Minimum log level for module output.
     * - `none`: No logging
     * - `error`: Only errors
     * - `warn`: Errors and warnings
     * - `log`: General info messages
     * - `debug`: All messages including debug
     * @default 'error'
     */
    logLevel?: 'debug' | 'error' | 'log' | 'none' | 'warn';

    /**
     * Default prefetch count for consumers.
     * @default 1
     */
    prefetchCount?: number;

    /** Queues to assert when the module initializes */
    queues?: QueueConfig[];

    /**
     * Discovery scan scope.
     * - `all`: Scan all providers in all modules
     * - `annotated`: Only scan classes with @RabbitController
     * - `modules`: Only scan providers in includeModules
     * - `providers`: Only scan includeProviders
     * @default 'all'
     */
    scanScope?: 'all' | 'annotated' | 'modules' | 'providers';

    /** Service discovery configuration */
    serviceDiscovery?: ServiceDiscoveryOptions;

    /**
     * RabbitMQ connection URI.
     * Format: `amqp://user:password@host:port/vhost`
     */
    uri: string;
}

/**
 * Factory interface for creating RabbitMQ module options.
 * Implement this interface to use with `useClass` or `useExisting`.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class RabbitMQConfigService implements RabbitMQOptionsFactory {
 *   constructor(private config: ConfigService) {}
 *
 *   createRabbitMQOptions(): RabbitMQModuleOptions {
 *     return {
 *       uri: this.config.get('RABBITMQ_URI'),
 *     };
 *   }
 * }
 * ```
 */
export interface RabbitMQOptionsFactory {
    /**
     * Creates and returns RabbitMQ module options.
     * @returns The module options, either directly or as a Promise
     */
    createRabbitMQOptions: () => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

/**
 * Options for the `@RabbitRPC` decorator.
 * Configures an RPC (request-reply) handler.
 *
 * @example
 * ```typescript
 * @RabbitRPC({
 *   queue: 'calculator',
 *   prefetchCount: 10,
 * })
 * async calculate(request: CalcRequest): Promise<CalcResponse> {
 *   return { result: request.a + request.b };
 * }
 * ```
 */
export interface RabbitRPCOptions {
    /**
     * Connection name for multi-connection setups.
     * @default 'default'
     */
    connectionName?: string;

    /** Consume options passed to channel.consume() */
    consumeOptions?: Options.Consume;

    /**
     * Disable automatic message acknowledgment.
     * @default false
     */
    noAck?: boolean;

    /**
     * Number of messages to prefetch.
     * @default 1
     */
    prefetchCount?: number;

    /** Queue name to consume RPC requests from */
    queue: string;

    /** Queue options if the queue needs to be asserted */
    queueOptions?: Options.AssertQueue;
}

/**
 * Options for the `@RabbitSubscribe` decorator.
 * Configures a message subscriber.
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({
 *   queue: 'orders',
 *   exchange: 'events',
 *   routingKey: 'order.created',
 *   errorHandler: async (err, msg) => {
 *     console.error('Error processing order:', err);
 *   },
 * })
 * async handleOrder(order: Order): Promise<void> {
 *   await this.processOrder(order);
 * }
 * ```
 */
export interface RabbitSubscribeOptions {
    /**
     * Connection name for multi-connection setups.
     * @default 'default'
     */
    connectionName?: string;

    /** Consume options passed to channel.consume() */
    consumeOptions?: Options.Consume;

    /**
     * Custom error handler for this subscriber.
     * Called when message processing throws an error.
     */
    errorHandler?: (error: Error, message: unknown) => Promise<void> | void;

    /** Exchange name (optional, can use queue directly) */
    exchange?: string;

    /** Queue name to consume from */
    queue: string;

    /** Queue options if the queue needs to be asserted */
    queueOptions?: Options.AssertQueue;

    /** Routing key pattern for binding queue to exchange */
    routingKey?: string;

    /**
     * Enable RPC mode (auto-reply).
     * When true, the return value is sent back as a reply.
     * @default false
     */
    rpc?: boolean;
}

/**
 * Options for RPC requests made via `RabbitMQService.request()`.
 *
 * @example
 * ```typescript
 * const response = await rabbitMQ.request('calculator', payload, {
 *   timeout: 5000,
 *   publishOptions: { priority: 10 },
 * });
 * ```
 */
export interface RpcOptions {
    /** Options for publishing the request message */
    publishOptions?: PublishOptions;

    /**
     * Timeout in milliseconds to wait for a response.
     * @default 30000 (30 seconds)
     */
    timeout?: number;
}
