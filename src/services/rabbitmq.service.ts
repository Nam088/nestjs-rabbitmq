import { randomUUID } from 'crypto';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, Message, Options } from 'amqplib';

import { PublishOptions, RpcOptions } from '../interfaces/rabbitmq-options.interface';
import { getErrorStack, LogLevel, shouldLog } from '../utils/log-utils';

/**
 * Core RabbitMQ service for publishing and consuming messages.
 * Provides a high-level API for interacting with RabbitMQ, including:
 * - Publishing messages to exchanges
 * - Sending messages directly to queues
 * - Consuming messages from queues
 * - RPC (request-reply) pattern support
 * - Exchange and queue management
 *
 * @example
 * ```typescript
 * @Injectable()
 * class NotificationService {
 *   constructor(
 *     @InjectRabbitMQ() private readonly rabbitMQ: RabbitMQService,
 *   ) {}
 *
 *   async sendNotification(userId: string, message: string): Promise<void> {
 *     await this.rabbitMQ.publish('notifications', 'user.notify', {
 *       userId,
 *       message,
 *       timestamp: new Date(),
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class RabbitMQService implements OnModuleDestroy {
    private channel: ChannelWrapper;
    private readonly logger = new Logger(RabbitMQService.name);
    private readonly logLevel: LogLevel;
    private replyQueueInitialized = false;
    private readonly rpcQueues = new Map<string, Map<string, (response: unknown) => void>>();

    /**
     * Creates an instance of RabbitMQService.
     *
     * @param {AmqpConnectionManager} connectionManager - The AMQP connection manager instance
     * @param {string} connectionName - The name of this connection (for multi-connection support)
     * @param {LogLevel} [logLevel='error'] - The minimum log level to output
     */
    constructor(
        private readonly connectionManager: AmqpConnectionManager,
        private readonly connectionName: string,
        logLevel: LogLevel = 'error',
    ) {
        this.logLevel = logLevel;
    }

    /**
     * NestJS lifecycle hook called when the module is being destroyed.
     * Cleans up RPC callback queues and closes the connection.
     *
     * @returns {Promise<void>}
     */
    async onModuleDestroy(): Promise<void> {
        this.rpcQueues.clear();
        await this.close();
    }

    /**
     * Gets the underlying AMQP channel wrapper.
     * Use this for advanced operations not covered by the service API.
     *
     * @returns {ChannelWrapper} The channel wrapper instance
     *
     * @example
     * ```typescript
     * const channel = rabbitMQ.getChannel();
     * await channel.prefetch(10);
     * ```
     */
    getChannel(): ChannelWrapper {
        return this.channel;
    }

    /**
     * Gets the AMQP connection manager.
     * Use this for connection-level operations.
     *
     * @returns {AmqpConnectionManager} The connection manager instance
     *
     * @example
     * ```typescript
     * const manager = rabbitMQ.getConnectionManager();
     * console.log('Connected:', manager.isConnected());
     * ```
     */
    getConnectionManager(): AmqpConnectionManager {
        return this.connectionManager;
    }

    /**
     * Gets or creates the reply queue for RPC operations.
     * Uses RabbitMQ's built-in direct reply-to feature.
     *
     * @private
     * @returns {Promise<string>} The reply queue name
     */
    private async getReplyQueue(): Promise<string> {
        const replyQueue = 'amq.rabbitmq.reply-to';

        // Only setup consumer once to prevent multiple consumers on the same queue
        if (this.replyQueueInitialized) {
            return replyQueue;
        }

        this.replyQueueInitialized = true;

        // Initialize callback map for this reply queue
        if (!this.rpcQueues.has(replyQueue)) {
            this.rpcQueues.set(replyQueue, new Map());
        }

        // Setup direct-reply-to consumer
        await this.channel.consume(
            replyQueue,
            (message: Message | null) => {
                if (!message) return;

                const { correlationId } = message.properties;

                const callbacks = this.rpcQueues.get(replyQueue);

                if (!callbacks) return;

                if (!callbacks.has(correlationId)) return;

                const callback = callbacks.get(correlationId);
                const response = this.deserializeMessage(message.content);

                if (callback) {
                    callback(response);
                }

                callbacks.delete(correlationId);
            },
            // Direct-reply-to requires noAck=true
            { noAck: true },
        );

        return replyQueue;
    }

    /**
     * Publishes a message to an exchange with a routing key.
     *
     * @param {string} exchange - The exchange name to publish to
     * @param {string} routingKey - The routing key for message routing
     * @param {unknown} message - The message payload (will be JSON serialized)
     * @param {PublishOptions} [options] - Additional publish options
     * @returns {Promise<boolean>} True if the message was published successfully
     * @throws {Error} If publishing fails
     *
     * @example
     * ```typescript
     * // Simple publish
     * await rabbitMQ.publish('events', 'user.created', { userId: '123' });
     *
     * // With options
     * await rabbitMQ.publish('events', 'user.created', payload, {
     *   persistent: true,
     *   priority: 5,
     *   expiration: '60000',
     * });
     * ```
     */
    async publish(exchange: string, routingKey: string, message: unknown, options?: PublishOptions): Promise<boolean> {
        this.debug(`Publishing message to ${exchange}/${routingKey}`);

        try {
            const content = this.serializeMessage(message);
            const publishOptions: Options.Publish = {
                persistent: true,
                ...options,
            };

            await this.channel.publish(exchange, routingKey, content, publishOptions);

            this.debug(`Successfully published message to ${exchange}/${routingKey}`);

            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to publish message to ${exchange}/${routingKey}`, getErrorStack(error));
            throw error;
        }
    }

    /**
     * Deserializes a message buffer to its original form.
     * Attempts JSON parsing, falls back to string if parsing fails.
     *
     * @private
     * @param {Buffer} buffer - The message content buffer
     * @returns {unknown} The deserialized message
     */
    private deserializeMessage(buffer: Buffer): unknown {
        try {
            const str = buffer.toString();

            return JSON.parse(str) as unknown;
        } catch {
            return buffer.toString();
        }
    }

    /**
     * Serializes a message to a Buffer for transmission.
     * Handles Buffer, string, and JSON-serializable objects.
     *
     * @private
     * @param {unknown} message - The message to serialize
     * @returns {Buffer} The serialized message as a Buffer
     */
    private serializeMessage(message: unknown): Buffer {
        if (Buffer.isBuffer(message)) {
            return message;
        }

        if (typeof message === 'string') {
            return Buffer.from(message);
        }

        return Buffer.from(JSON.stringify(message));
    }

    /**
     * Asserts (creates if not exists) an exchange.
     *
     * @param {string} exchange - The exchange name
     * @param {'direct' | 'fanout' | 'headers' | 'topic'} type - The exchange type
     * @param {Options.AssertExchange} [options] - Exchange options (durable defaults to true)
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await rabbitMQ.assertExchange('events', 'topic', { durable: true });
     * await rabbitMQ.assertExchange('notifications', 'fanout');
     * ```
     */
    async assertExchange(
        exchange: string,
        type: 'direct' | 'fanout' | 'headers' | 'topic',
        options?: Options.AssertExchange,
    ): Promise<void> {
        await this.channel.assertExchange(exchange, type, {
            durable: true,
            ...options,
        });
    }

    /**
     * Asserts (creates if not exists) a queue.
     *
     * @param {string} queue - The queue name
     * @param {Options.AssertQueue} [options] - Queue options (durable defaults to true)
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await rabbitMQ.assertQueue('orders', { durable: true });
     * await rabbitMQ.assertQueue('temp-queue', { exclusive: true, autoDelete: true });
     * ```
     */
    async assertQueue(queue: string, options?: Options.AssertQueue): Promise<void> {
        await this.channel.assertQueue(queue, {
            durable: true,
            ...options,
        });
    }

    /**
     * Binds a queue to an exchange with a routing key.
     *
     * @param {string} queue - The queue name to bind
     * @param {string} exchange - The exchange name to bind to
     * @param {string} routingKey - The routing key pattern
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await rabbitMQ.bindQueue('user-events', 'events', 'user.*');
     * await rabbitMQ.bindQueue('all-logs', 'logs', '#');
     * ```
     */
    async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        await this.channel.bindQueue(queue, exchange, routingKey);
    }

    /**
     * Closes the RabbitMQ connection and channel.
     * Called automatically on module destroy.
     *
     * @returns {Promise<void>}
     */
    async close(): Promise<void> {
        this.info(`Closing RabbitMQ connection: ${this.connectionName}`);
        await this.channel?.close();
        await this.connectionManager?.close();
    }

    /**
     * Starts consuming messages from a queue.
     * Messages are automatically acknowledged on successful processing,
     * or rejected (not requeued) on error.
     *
     * @param {string} queue - The queue name to consume from
     * @param {(msg: unknown) => Promise<void> | void} onMessage - The message handler callback
     * @param {Options.Consume} [options] - Consume options (noAck defaults to false)
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await rabbitMQ.consume('orders', async (message) => {
     *   const order = message as Order;
     *   await this.processOrder(order);
     * });
     *
     * // With options
     * await rabbitMQ.consume('priority-orders', handler, { priority: 10 });
     * ```
     */
    async consume(
        queue: string,
        onMessage: (msg: unknown) => Promise<void> | void,
        options?: Options.Consume,
    ): Promise<void> {
        await this.channel.consume(
            queue,

            async (message: Message | null) => {
                if (!message) {
                    return;
                }

                try {
                    const content = this.deserializeMessage(message.content);

                    await onMessage(content);
                    this.channel.ack(message);
                } catch (error: unknown) {
                    this.logger.error(`Error processing message from ${queue}`, getErrorStack(error));
                    this.channel.nack(message, false, false); // Don't requeue
                }
            },
            {
                noAck: false,
                ...options,
            },
        );

        this.info(`Started consuming from queue: ${queue}`);
    }

    /**
     * Initializes the RabbitMQ channel.
     * Must be called before using any other methods.
     *
     * @returns {Promise<void>}
     */
    async initialize(): Promise<void> {
        this.info(`Initializing RabbitMQ channel for connection: ${this.connectionName}`);

        this.channel = this.connectionManager.createChannel({
            json: false,
            setup: async (channel: ConfirmChannel) => {
                await channel.prefetch(1);
                this.info(`Channel setup complete for: ${this.connectionName}`);
            },
        });

        await this.channel.waitForConnect();
        this.info(`RabbitMQ channel connected for: ${this.connectionName}`);
    }

    /**
     * Checks if the connection is currently connected.
     *
     * @returns {boolean} True if connected, false otherwise
     *
     * @example
     * ```typescript
     * if (!rabbitMQ.isConnected()) {
     *   console.warn('RabbitMQ is not connected!');
     * }
     * ```
     */
    isConnected(): boolean {
        return this.connectionManager.isConnected();
    }

    /**
     * Performs an RPC (Remote Procedure Call) request.
     * Sends a message to a queue and waits for a response.
     *
     * @template T - The expected response type
     * @param {string} queue - The queue name to send the request to
     * @param {unknown} message - The request message payload
     * @param {RpcOptions} [options={}] - RPC options including timeout and publish options
     * @returns {Promise<T>} The response from the RPC handler
     * @throws {Error} If the request times out or sending fails
     *
     * @example
     * ```typescript
     * interface CalculateRequest {
     *   a: number;
     *   b: number;
     * }
     *
     * interface CalculateResponse {
     *   result: number;
     * }
     *
     * const response = await rabbitMQ.request<CalculateResponse>(
     *   'calculator-rpc',
     *   { a: 5, b: 3 } as CalculateRequest,
     *   { timeout: 5000 }
     * );
     *
     * console.log('Result:', response.result); // 8
     * ```
     */
    async request<T = unknown>(queue: string, message: unknown, options: RpcOptions = {}): Promise<T> {
        const { publishOptions = {}, timeout = 30000 } = options;
        const correlationId = randomUUID();

        const replyQueue = await this.getReplyQueue();

        return new Promise<T>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const callbacks = this.rpcQueues.get(replyQueue);

                this.logger.error(`RPC timeout after ${timeout}ms (correlationId=${correlationId})`);
                callbacks?.delete(correlationId);
                reject(new Error(`RPC timeout after ${timeout}ms`));
            }, timeout);

            // Store callback
            if (!this.rpcQueues.has(replyQueue)) {
                this.rpcQueues.set(replyQueue, new Map());
            }

            const callbackMap = this.rpcQueues.get(replyQueue)!;

            callbackMap.set(correlationId, (response: unknown) => {
                clearTimeout(timeoutId);
                resolve(response as T);
            });

            // Send request
            this.sendToQueue(queue, message, {
                ...publishOptions,
                replyTo: replyQueue,
                correlationId,
            })
                .then(() => {
                    // Request sent successfully
                })
                .catch((error: unknown) => {
                    clearTimeout(timeoutId);
                    callbackMap.delete(correlationId);
                    this.logger.error(
                        `[RPC] Send failed: correlationId=${correlationId}, queue=${queue}, error=${String((error as Error)?.message ?? error)}`,
                        (error as Error)?.stack,
                    );
                    reject(error instanceof Error ? error : new Error(String(error)));
                });
        });
    }

    /**
     * Sends a message directly to a queue (bypassing exchanges).
     *
     * @param {string} queue - The queue name to send to
     * @param {unknown} message - The message payload (will be JSON serialized)
     * @param {Options.Publish} [options] - Send options
     * @returns {Promise<boolean>} True if the message was sent successfully
     * @throws {Error} If sending fails
     *
     * @example
     * ```typescript
     * await rabbitMQ.sendToQueue('tasks', { taskId: '123', action: 'process' });
     *
     * // With options
     * await rabbitMQ.sendToQueue('priority-tasks', payload, {
     *   priority: 10,
     *   expiration: '300000',
     * });
     * ```
     */
    async sendToQueue(queue: string, message: unknown, options?: Options.Publish): Promise<boolean> {
        this.debug(`Sending message to queue ${queue}`);

        try {
            const content = this.serializeMessage(message);
            const sendOptions: Options.Publish = {
                persistent: true,
                ...options,
            };

            await this.channel.sendToQueue(queue, content, sendOptions);

            this.debug(`Successfully sent message to queue ${queue}`);

            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to send message to queue ${queue}`, getErrorStack(error));
            throw error;
        }
    }

    /**
     * Logs a debug message if debug level is enabled.
     * @private
     */
    private debug(message: string): void {
        if (shouldLog('debug', this.logLevel)) this.logger.debug(message);
    }

    /**
     * Logs an info message if log level is enabled.
     * @private
     */
    private info(message: string): void {
        if (shouldLog('log', this.logLevel)) this.logger.log(message);
    }

    /**
     * Logs a warning message if warn level is enabled.
     * @private
     */
    private warn(message: string): void {
        if (shouldLog('warn', this.logLevel)) this.logger.warn(message);
    }
}
