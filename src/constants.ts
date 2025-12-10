/**
 * @fileoverview Constants used throughout the RabbitMQ module.
 * Contains injection tokens, metadata keys, and default values.
 */

/**
 * Injection token for RabbitMQ module options.
 * Used internally to provide module configuration.
 * @internal
 */
export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';

/**
 * Injection token for the AMQP connection manager.
 * Used internally to inject the connection manager instance.
 * @internal
 */
export const RABBITMQ_CONNECTION_MANAGER = 'RABBITMQ_CONNECTION_MANAGER';

/**
 * Injection token for the RabbitMQ service.
 * Use `@InjectRabbitMQ()` decorator instead of injecting this directly.
 * @see {@link InjectRabbitMQ}
 */
export const RABBITMQ_SERVICE = 'RABBITMQ_SERVICE';

/**
 * Metadata key for the `@RabbitSubscribe` decorator.
 * Stores subscription options on decorated methods.
 * @internal
 */
export const RABBITMQ_SUBSCRIBE_METADATA = 'RABBITMQ_SUBSCRIBE_METADATA';

/**
 * Injection token for the Service Discovery service.
 * Use `@InjectServiceDiscovery()` decorator instead of injecting this directly.
 * @see {@link InjectServiceDiscovery}
 */
export const RABBITMQ_SERVICE_DISCOVERY = 'RABBITMQ_SERVICE_DISCOVERY';

/**
 * Default connection name used when no custom name is specified.
 * @default 'default'
 */
export const DEFAULT_CONNECTION_NAME = 'default';

/**
 * Metadata key for the `@RabbitHandler` decorator.
 * Stores handler options on decorated methods.
 * @internal
 */
export const RABBIT_HANDLER_METADATA = 'RABBIT_HANDLER_METADATA';

/**
 * Metadata key for the `@RabbitRPC` decorator.
 * Stores RPC handler options on decorated methods.
 * @internal
 */
export const RABBIT_RPC_METADATA = 'RABBIT_RPC_METADATA';

/**
 * Metadata key for the `@RabbitController` decorator.
 * Marks a class as containing RabbitMQ handlers.
 * @internal
 */
export const RABBIT_CONTROLLER_KEY = 'RABBIT_CONTROLLER';
