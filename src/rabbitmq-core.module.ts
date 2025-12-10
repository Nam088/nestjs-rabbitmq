import { ModuleRef, ModulesContainer } from '@nestjs/core';

import { DynamicModule, Global, Logger, Module, OnApplicationBootstrap, Provider } from '@nestjs/common';

import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import * as amqp from 'amqp-connection-manager';
import { AmqpConnectionManager } from 'amqp-connection-manager';

import { RabbitMQService } from './services/rabbitmq.service';
import { ServiceDiscoveryService } from './services/service-discovery.service';

import {
    RabbitMQModuleAsyncOptions,
    RabbitMQModuleOptions,
    RabbitMQOptionsFactory,
} from './interfaces/rabbitmq-options.interface';

import { getErrorStack } from './utils/log-utils';

import {
    DEFAULT_CONNECTION_NAME,
    RABBIT_CONTROLLER_KEY,
    RABBIT_HANDLER_METADATA,
    RABBIT_RPC_METADATA,
    RABBITMQ_CONNECTION_MANAGER,
    RABBITMQ_MODULE_OPTIONS,
    RABBITMQ_SERVICE,
    RABBITMQ_SERVICE_DISCOVERY,
    RABBITMQ_SUBSCRIBE_METADATA,
} from './constants';

/**
 * Core module for RabbitMQ
 */
@Global()
@Module({})
export class RabbitMQCoreModule implements OnApplicationBootstrap {
    private readonly logger = new Logger(RabbitMQCoreModule.name);
    private readonly metadataScanner = new MetadataScanner();

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly modulesContainer: ModulesContainer,
    ) {}

    /**
     * Register RabbitMQ module with static options
     */
    static forRoot(options: RabbitMQModuleOptions): DynamicModule {
        const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;

        const connectionManagerProvider: Provider = {
            provide: `${RABBITMQ_CONNECTION_MANAGER}_${connectionName}`,
            useFactory: () =>
                amqp.connect([options.uri], {
                    heartbeatIntervalInSeconds: options.connectionOptions?.heartbeatIntervalInSeconds || 5,
                    reconnectTimeInSeconds: options.connectionOptions?.reconnectTimeInSeconds || 10,
                }),
        };

        const serviceProvider: Provider = {
            inject: [`${RABBITMQ_CONNECTION_MANAGER}_${connectionName}`],
            provide: `${RABBITMQ_SERVICE}_${connectionName}`,
            useFactory: async (connectionManager: AmqpConnectionManager) => {
                const service = new RabbitMQService(connectionManager, connectionName, options.logLevel ?? 'error');

                await service.initialize();

                // Assert exchanges
                if (options.exchanges) {
                    for (const exchange of options.exchanges) {
                        await service.assertExchange(exchange.name, exchange.type, exchange.options);
                    }
                }

                // Assert queues
                if (options.queues) {
                    for (const queue of options.queues) {
                        await service.assertQueue(queue.name, queue.options);
                    }
                }

                return service;
            },
        };

        const optionsProvider: Provider = {
            provide: `${RABBITMQ_MODULE_OPTIONS}_${connectionName}`,
            useValue: options,
        };

        const providers = [connectionManagerProvider, serviceProvider, optionsProvider];
        const exports = [serviceProvider];

        // Add service discovery if enabled
        if (options.serviceDiscovery?.enabled) {
            const discoveryProvider: Provider = {
                inject: [`${RABBITMQ_SERVICE}_${connectionName}`],
                provide: `${RABBITMQ_SERVICE_DISCOVERY}_${connectionName}`,
                useFactory: (rabbitService: RabbitMQService) =>
                    new ServiceDiscoveryService(rabbitService, options.serviceDiscovery!),
            };

            providers.push(discoveryProvider);
            exports.push(discoveryProvider);
        }

        return {
            providers,
            exports,
            module: RabbitMQCoreModule,
        };
    }

    /**
     * Register RabbitMQ module with async options
     */
    static forRootAsync(options: RabbitMQModuleAsyncOptions): DynamicModule {
        const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;

        const connectionManagerProvider: Provider = {
            inject: [`${RABBITMQ_MODULE_OPTIONS}_${connectionName}`],
            provide: `${RABBITMQ_CONNECTION_MANAGER}_${connectionName}`,
            useFactory: (moduleOptions: RabbitMQModuleOptions) =>
                amqp.connect([moduleOptions.uri], {
                    heartbeatIntervalInSeconds: moduleOptions.connectionOptions?.heartbeatIntervalInSeconds || 5,
                    reconnectTimeInSeconds: moduleOptions.connectionOptions?.reconnectTimeInSeconds || 10,
                }),
        };

        const serviceProvider: Provider = {
            inject: [
                `${RABBITMQ_CONNECTION_MANAGER}_${connectionName}`,
                `${RABBITMQ_MODULE_OPTIONS}_${connectionName}`,
            ],
            provide: `${RABBITMQ_SERVICE}_${connectionName}`,
            useFactory: async (connectionManager: AmqpConnectionManager, moduleOptions: RabbitMQModuleOptions) => {
                const service = new RabbitMQService(
                    connectionManager,
                    connectionName,
                    moduleOptions.logLevel ?? 'error',
                );

                await service.initialize();

                // Assert exchanges
                if (moduleOptions.exchanges) {
                    for (const exchange of moduleOptions.exchanges) {
                        await service.assertExchange(exchange.name, exchange.type, exchange.options);
                    }
                }

                // Assert queues
                if (moduleOptions.queues) {
                    for (const queue of moduleOptions.queues) {
                        await service.assertQueue(queue.name, queue.options);
                    }
                }

                return service;
            },
        };

        // Service discovery provider (created conditionally based on moduleOptions at runtime)
        const discoveryProvider: Provider = {
            inject: [`${RABBITMQ_SERVICE}_${connectionName}`, `${RABBITMQ_MODULE_OPTIONS}_${connectionName}`],
            provide: `${RABBITMQ_SERVICE_DISCOVERY}_${connectionName}`,
            useFactory: (rabbitService: RabbitMQService, moduleOptions: RabbitMQModuleOptions) => {
                if (!moduleOptions.serviceDiscovery?.enabled) {
                    return null;
                }

                return new ServiceDiscoveryService(rabbitService, moduleOptions.serviceDiscovery);
            },
        };

        const asyncProviders = this.createAsyncProviders(options, connectionName);

        const providers = [...asyncProviders, connectionManagerProvider, serviceProvider, discoveryProvider];
        const exports = [serviceProvider, discoveryProvider];

        return {
            imports: options.imports || [],
            providers,
            exports,
            module: RabbitMQCoreModule,
        };
    }

    /**
     * Discover and register subscribers using internal scanner after app bootstrap
     */
    async onApplicationBootstrap(): Promise<void> {
        const moduleOptions: RabbitMQModuleOptions | undefined = this.moduleRef.get(
            `${RABBITMQ_MODULE_OPTIONS}_${DEFAULT_CONNECTION_NAME}`,
            { strict: false },
        );

        const autoDiscover = moduleOptions?.autoDiscover !== false;

        if (!autoDiscover) {
            return;
        }

        for (const moduleRef of this.modulesContainer.values()) {
            if (!this.shouldScanModule(moduleRef, moduleOptions)) continue;

            await this.processModuleProviders(moduleRef, moduleOptions);
        }
    }

    /**
     * Create async options provider
     */
    private static createAsyncOptionsProvider(options: RabbitMQModuleAsyncOptions, connectionName: string): Provider {
        if (options.useFactory) {
            return {
                inject: options.inject || [],
                provide: `${RABBITMQ_MODULE_OPTIONS}_${connectionName}`,
                useFactory: options.useFactory,
            };
        }

        const inject = options.useExisting || options.useClass;

        return {
            inject: inject ? [inject] : [],
            provide: `${RABBITMQ_MODULE_OPTIONS}_${connectionName}`,
            useFactory: async (optionsFactory: RabbitMQOptionsFactory) => await optionsFactory.createRabbitMQOptions(),
        };
    }

    /**
     * Create async providers
     */
    private static createAsyncProviders(options: RabbitMQModuleAsyncOptions, connectionName: string): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options, connectionName)];
        }

        if (options.useClass) {
            return [
                this.createAsyncOptionsProvider(options, connectionName),
                {
                    provide: options.useClass,
                    useClass: options.useClass,
                },
            ];
        }

        return [];
    }

    private getProviderToken(provider: any): string | undefined {
        return provider?.name || provider?.metatype?.name || provider?.token;
    }

    private async processModuleProviders(moduleRef: any, options?: RabbitMQModuleOptions): Promise<void> {
        for (const provider of moduleRef.providers.values()) {
            if (!this.shouldScanProvider(provider, options)) continue;

            const instance = provider.instance as Record<string, unknown> | undefined;
            const prototype = instance && Object.getPrototypeOf(instance);

            if (!instance || !prototype) {
                continue;
            }

            this.processProviderMethods(instance, prototype);
        }
    }

    private processProviderMethods(instance: Record<string, unknown>, prototype: object): void {
        const methodNames = this.metadataScanner.getAllMethodNames(prototype);

        for (const methodName of methodNames) {
            // Get method descriptor (function) from prototype - SetMetadata stores on the function itself
            const methodDescriptor = (prototype as Record<string, unknown>)[methodName];

            // Read metadata directly from method descriptor (like in tests: TestClass.prototype.handleRPC)
            const subOptions = methodDescriptor
                ? (Reflect.getMetadata(RABBITMQ_SUBSCRIBE_METADATA, methodDescriptor) as
                      | Record<string, unknown>
                      | undefined)
                : undefined;
            const rpcOptions = methodDescriptor
                ? (Reflect.getMetadata(RABBIT_RPC_METADATA, methodDescriptor) as Record<string, unknown> | undefined)
                : undefined;
            const handlerOptions = methodDescriptor
                ? (Reflect.getMetadata(RABBIT_HANDLER_METADATA, methodDescriptor) as
                      | Record<string, unknown>
                      | undefined)
                : undefined;

            if (subOptions) void this.registerDiscoveredHandler(instance, methodName, subOptions);

            if (rpcOptions) void this.registerDiscoveredRpcHandler(instance, methodName, rpcOptions);

            // @RabbitHandler is an alias for @RabbitSubscribe, register the same way
            if (handlerOptions) void this.registerDiscoveredHandler(instance, methodName, handlerOptions);
        }
    }

    private hasRabbitControllerMetadata(provider: any): boolean {
        const instance = provider.instance as Record<string, unknown> | undefined;
        const ctor = instance?.constructor ?? provider?.metatype;

        return !!(ctor && Reflect.getMetadata && Reflect.getMetadata(RABBIT_CONTROLLER_KEY, ctor));
    }

    private isProviderExcluded(provider: any, token: string | undefined, options?: RabbitMQModuleOptions): boolean {
        const excludeList = options?.excludeProviders;

        if (!excludeList || excludeList.length === 0) {
            return false;
        }

        return excludeList.some((p: any) => this.matchesProvider(p, token, provider?.metatype));
    }

    private isProviderIncluded(provider: any, token: string | undefined, options?: RabbitMQModuleOptions): boolean {
        const includeList = options?.includeProviders;

        if (!includeList || includeList.length === 0) {
            return true;
        }

        return includeList.some((p: any) => this.matchesProvider(p, token, provider?.metatype));
    }

    private matchesProvider(pattern: any, token: string | undefined, metatype: any): boolean {
        return typeof pattern === 'string' ? pattern === token : pattern === metatype;
    }

    private async registerDiscoveredHandler(
        instance: Record<string, unknown>,
        methodName: string,
        options: any,
    ): Promise<void> {
        const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;
        const rabbitService: RabbitMQService = this.moduleRef.get(`${RABBITMQ_SERVICE}_${connectionName}`, {
            strict: false,
        });

        if (!rabbitService) {
            this.logger.error(`RabbitMQ service not found for connection: ${connectionName}`);

            return;
        }

        try {
            if (options.queue) {
                await rabbitService.assertQueue(options.queue, options.queueOptions);
            }

            if (options.exchange && options.routingKey && options.queue) {
                await rabbitService.bindQueue(options.queue, options.exchange, options.routingKey);
            }

            const handler = (instance as any)[methodName].bind(instance);

            if (options.queue) {
                await rabbitService.consume(
                    options.queue,
                    async (message: unknown) => handler(message),
                    options.consumeOptions,
                );
                this.logger.log(
                    `Registered subscriber: ${instance.constructor?.name}.${methodName} -> ${options.queue}`,
                );
            }
        } catch (error: unknown) {
            this.logger.error(
                `Failed to register subscriber ${(instance.constructor && (instance.constructor as any).name) || 'Unknown'}.${methodName}`,
                getErrorStack(error),
            );
        }
    }

    private async registerDiscoveredRpcHandler(
        instance: Record<string, unknown>,
        methodName: string,
        options: any,
    ): Promise<void> {
        const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;
        const rabbitService: RabbitMQService = this.moduleRef.get(`${RABBITMQ_SERVICE}_${connectionName}`, {
            strict: false,
        });

        if (!rabbitService) {
            this.logger.error(`RabbitMQ service not found for connection: ${connectionName}`);

            return;
        }

        if (options.queue) {
            await rabbitService.assertQueue(options.queue, options.queueOptions);
        }

        const handler = (instance as any)[methodName].bind(instance);
        const channel: any = rabbitService.getChannel();

        await channel.consume(
            options.queue,
            async (msg: any) => {
                if (!msg) {
                    return;
                }

                try {
                    // message received
                    const payloadStr = msg.content?.toString();
                    let payload: unknown = payloadStr;

                    try {
                        payload = JSON.parse(payloadStr);
                    } catch {
                        this.logger.error(`Failed to parse payload as JSON, using raw string: ${payloadStr}`);
                    }

                    const response = await handler(payload);
                    const responseBuffer = Buffer.isBuffer(response)
                        ? response
                        : Buffer.from(JSON.stringify(response ?? null));

                    if (msg.properties?.replyTo) {
                        // send reply
                        await channel.sendToQueue(msg.properties.replyTo, responseBuffer, {
                            persistent: false,
                            correlationId: msg.properties.correlationId,
                        });
                    }

                    channel.ack?.(msg);
                } catch (error: unknown) {
                    this.logger.error(
                        `Failed to process RPC ${(instance.constructor && (instance.constructor as any).name) || 'Unknown'}.${methodName}`,
                        getErrorStack(error),
                    );
                    channel.nack?.(msg, false, false);
                }
            },
            {
                noAck: false,
                prefetch: options.prefetchCount || 1,
                ...options.consumeOptions,
            },
        );

        this.logger.log(`Registered RPC handler: ${instance.constructor?.name}.${methodName} -> ${options.queue}`);
    }

    private shouldScanModule(moduleRef: any, options?: RabbitMQModuleOptions): boolean {
        const scope = options?.scanScope ?? 'all';

        if (scope === 'all') return true;

        if (scope === 'modules' || scope === 'annotated' || scope === 'providers') {
            const include = options?.includeModules;

            if (!include || include.length === 0) return true;

            const name: string | undefined = moduleRef?.metatype?.name;

            return include.some((m: any) => (typeof m === 'string' ? m === name : m === moduleRef?.metatype));
        }

        return true;
    }

    private shouldScanProvider(provider: any, options?: RabbitMQModuleOptions): boolean {
        const scope = options?.scanScope ?? 'all';
        const token = this.getProviderToken(provider);

        if (this.isProviderExcluded(provider, token, options)) {
            return false;
        }

        if (!this.isProviderIncluded(provider, token, options)) {
            return false;
        }

        if (scope === 'annotated') {
            return this.hasRabbitControllerMetadata(provider);
        }

        return true;
    }
}
