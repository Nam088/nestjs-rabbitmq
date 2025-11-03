import { randomUUID } from 'crypto';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, Message, Options } from 'amqplib';

import { PublishOptions, RpcOptions } from '../interfaces/rabbitmq-options.interface';

/**
 * RabbitMQ Service for publishing and consuming messages
 */
@Injectable()
export class RabbitMQService implements OnModuleDestroy {
    private channel: ChannelWrapper;
    private readonly logger = new Logger(RabbitMQService.name);
    private readonly logLevel: 'debug' | 'error' | 'log' | 'none' | 'warn';
    private readonly rpcQueues = new Map<string, any>();

    constructor(
        private readonly connectionManager: AmqpConnectionManager,
        private readonly connectionName: string,
        logLevel: 'debug' | 'error' | 'log' | 'none' | 'warn' = 'error',
    ) {
        this.logLevel = logLevel;
    }

    /**
     * Module destroy lifecycle hook
     */
    async onModuleDestroy(): Promise<void> {
        await this.close();
    }

    /**
     * Get the underlying channel
     */
    getChannel(): ChannelWrapper {
        return this.channel;
    }

    /**
     * Get the connection manager
     */
    getConnectionManager(): AmqpConnectionManager {
        return this.connectionManager;
    }

    /**
     * Get or create a reply queue for RPC
     */
    private async getReplyQueue(): Promise<string> {
        const replyQueue = 'amq.rabbitmq.reply-to';

        // setup direct-reply-to consumer

        await this.channel.consume(
            replyQueue,
            (message: Message | null) => {
                if (!message) return;

                const { correlationId } = message.properties;
                // reply received

                const callbacks = this.rpcQueues.get(replyQueue);

                if (!callbacks) return;

                if (!callbacks.has(correlationId)) return;

                const callback = callbacks.get(correlationId);
                const response = this.deserializeMessage(message.content);

                callback(response);
                callbacks.delete(correlationId);
                // callback completed
            },
            // Direct-reply-to requires noAck=true
            { noAck: true },
        );

        // reply queue ready

        return replyQueue;
    }

    /**
     * Publish a message to an exchange
     * @param exchange - Exchange name
     * @param routingKey - Routing key
     * @param message - Message to publish
     * @param options - Publish options
     */
    async publish(exchange: string, routingKey: string, message: any, options?: PublishOptions): Promise<boolean> {
        try {
            const content = this.serializeMessage(message);
            const publishOptions: Options.Publish = {
                persistent: true,
                ...options,
            };

            await this.channel.publish(exchange, routingKey, content, publishOptions);

            // published

            return true;
        } catch (error) {
            this.logger.error(`Failed to publish message to ${exchange}/${routingKey}`, error.stack);
            throw error;
        }
    }

    /**
     * Deserialize a message from Buffer
     */
    private deserializeMessage(buffer: Buffer): any {
        try {
            const str = buffer.toString();

            return JSON.parse(str);
        } catch {
            return buffer.toString();
        }
    }

    /**
     * Serialize a message to Buffer
     */
    private serializeMessage(message: any): Buffer {
        if (Buffer.isBuffer(message)) {
            return message;
        }

        if (typeof message === 'string') {
            return Buffer.from(message);
        }

        return Buffer.from(JSON.stringify(message));
    }

    /**
     * Assert an exchange
     * @param exchange - Exchange name
     * @param type - Exchange type
     * @param options - Exchange options
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
        // asserted
    }

    /**
     * Assert a queue
     * @param queue - Queue name
     * @param options - Queue options
     */
    async assertQueue(queue: string, options?: Options.AssertQueue): Promise<void> {
        await this.channel.assertQueue(queue, {
            durable: true,
            ...options,
        });
        // asserted
    }

    /**
     * Bind a queue to an exchange
     * @param queue - Queue name
     * @param exchange - Exchange name
     * @param routingKey - Routing key
     */
    async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        await this.channel.bindQueue(queue, exchange, routingKey);
        // bound
    }

    /**
     * Close the connection
     */
    async close(): Promise<void> {
        this.info(`Closing RabbitMQ connection: ${this.connectionName}`);
        await this.channel?.close();
        await this.connectionManager?.close();
    }

    /**
     * Consume messages from a queue
     * @param queue - Queue name
     * @param onMessage - Message handler
     * @param options - Consume options
     */
    async consume(
        queue: string,
        onMessage: (msg: any) => Promise<void> | void,
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
                } catch (error) {
                    this.logger.error(`Error processing message from ${queue}`, error.stack);
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
     * Initialize the channel
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
     * Check if the connection is connected
     */
    isConnected(): boolean {
        return this.connectionManager.isConnected();
    }

    /**
     * RPC request-reply pattern
     * @param queue - Queue name
     * @param message - Message to send
     * @param options - RPC options
     */
    async request<T = any>(queue: string, message: any, options: RpcOptions = {}): Promise<T> {
        const { publishOptions = {}, timeout = 30000 } = options;
        const correlationId = randomUUID();

        // start request

        const replyQueue = await this.getReplyQueue();

        // reply queue ready

        return new Promise<T>(async (resolve, reject) => {
            // request initialized

            const timeoutId = setTimeout(() => {
                const callbacks = this.rpcQueues.get(replyQueue);

                this.logger.error(`RPC timeout after ${timeout}ms (correlationId=${correlationId})`);
                callbacks?.delete(correlationId);
                reject(new Error(`RPC timeout after ${timeout}ms`));
            }, timeout);

            // Store callback
            if (!this.rpcQueues.has(replyQueue)) {
                this.rpcQueues.set(replyQueue, new Map());
                // created map
            }

            const callbackMap = this.rpcQueues.get(replyQueue)!;

            callbackMap.set(correlationId, (response: any) => {
                clearTimeout(timeoutId);
                // callback invoked
                resolve(response);
            });

            // stored

            // Send request
            try {
                await this.sendToQueue(queue, message, {
                    ...publishOptions,
                    replyTo: replyQueue,
                    correlationId,
                });
            } catch (error) {
                clearTimeout(timeoutId);
                callbackMap.delete(correlationId);
                this.logger.error(
                    `[RPC] Send failed: correlationId=${correlationId}, queue=${queue}, error=${String((error as Error)?.message ?? error)}`,
                    (error as Error)?.stack,
                );
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /**
     * Send a message directly to a queue
     * @param queue - Queue name
     * @param message - Message to send
     * @param options - Send options
     */
    async sendToQueue(queue: string, message: any, options?: Options.Publish): Promise<boolean> {
        try {
            const content = this.serializeMessage(message);
            const sendOptions: Options.Publish = {
                persistent: true,
                ...options,
            };

            await this.channel.sendToQueue(queue, content, sendOptions);

            // sent

            return true;
        } catch (error) {
            this.logger.error(`Failed to send message to queue ${queue}`, error.stack);
            throw error;
        }
    }

    private debug(message: string): void {
        if (this.shouldLog('debug')) this.logger.debug(message);
    }

    private info(message: string): void {
        if (this.shouldLog('log')) this.logger.log(message);
    }

    private shouldLog(level: 'debug' | 'error' | 'log' | 'warn'): boolean {
        const order: Record<'debug' | 'error' | 'log' | 'none' | 'warn', number> = {
            debug: 3,
            error: 0,
            log: 2,
            none: -1,
            warn: 1,
        };

        return order[level] <= order[this.logLevel];
    }

    private warn(message: string): void {
        if (this.shouldLog('warn')) this.logger.warn(message);
    }
}
