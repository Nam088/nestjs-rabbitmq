import { ModuleRef, ModulesContainer } from '@nestjs/core';

import { DynamicModule, Global, Logger, Module, OnModuleInit, Provider } from '@nestjs/common';

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

import {
    DEFAULT_CONNECTION_NAME,
    RABBITMQ_CONNECTION_MANAGER,
    RABBITMQ_MODULE_OPTIONS,
    RABBITMQ_SERVICE,
    RABBITMQ_SERVICE_DISCOVERY,
} from './constants';

/**
 * Core module for RabbitMQ
 */
@Global()
@Module({})
export class RabbitMQCoreModule implements OnModuleInit {
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
                const service = new RabbitMQService(connectionManager, connectionName);

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
                const service = new RabbitMQService(connectionManager, connectionName);

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

        const asyncProviders = this.createAsyncProviders(options, connectionName);

        const providers = [...asyncProviders, connectionManagerProvider, serviceProvider];
        const exports = [serviceProvider];

        return {
            imports: options.imports || [],
            providers,
            exports,
            module: RabbitMQCoreModule,
        };
    }

    /**
     * Discover and register subscribers using internal scanner
     */
    async onModuleInit(): Promise<void> {
        const SUBSCRIBE_KEY = 'RABBITMQ_SUBSCRIBE_METADATA';

        for (const moduleRef of this.modulesContainer.values()) {
            for (const provider of moduleRef.providers.values()) {
                const instance = provider.instance as Record<string, unknown> | undefined;
                const prototype = instance && Object.getPrototypeOf(instance);

                if (!instance || !prototype) continue;

                const methodNames = this.metadataScanner.getAllMethodNames(prototype);

                for (const methodName of methodNames) {
                    const options: any = Reflect.getMetadata(SUBSCRIBE_KEY, instance, methodName);

                    if (!options) continue;

                    void this.registerDiscoveredHandler(instance, methodName, options);
                }
            }
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
        } catch (error: any) {
            this.logger.error(
                `Failed to register subscriber ${(instance.constructor && (instance.constructor as any).name) || 'Unknown'}.${methodName}`,
                error?.stack,
            );
        }
    }
}
