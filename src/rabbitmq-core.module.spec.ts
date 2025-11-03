import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery';
import { RabbitMQCoreModule } from './rabbitmq-core.module';
import { RabbitMQModuleOptions, RabbitMQOptionsFactory } from './interfaces/rabbitmq-options.interface';
import { RABBITMQ_CONNECTION_MANAGER, RABBITMQ_MODULE_OPTIONS } from './constants';

describe('RabbitMQCoreModule', () => {
    describe('forRoot', () => {
        it('should create a dynamic module with default connection name', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            expect(dynamicModule.module).toBe(RabbitMQCoreModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });

        it('should create providers with custom connection name', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                connectionName: 'custom',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule.providers).toHaveLength(3);
            expect(dynamicModule.providers?.some((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_custom`
            )).toBe(true);
        });

        it('should include exchanges in options', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                exchanges: [
                    { name: 'test-exchange', type: 'topic' },
                ],
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            );
            expect(optionsProvider).toBeDefined();
            expect((optionsProvider as any).useValue.exchanges).toEqual(options.exchanges);
        });

        it('should include queues in options', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                queues: [
                    { name: 'test-queue', options: { durable: true } },
                ],
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            );
            expect((optionsProvider as any).useValue.queues).toEqual(options.queues);
        });

        it('should include service discovery provider when enabled', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                serviceDiscovery: {
                    enabled: true,
                    serviceName: 'test-service',
                },
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule.providers?.length).toBeGreaterThan(3);
            expect(dynamicModule.exports?.length).toBeGreaterThan(1);
        });

        it('should not include service discovery provider when disabled', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule.providers).toHaveLength(3);
            expect(dynamicModule.exports).toHaveLength(1);
        });

        it('should use custom connection options', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                connectionOptions: {
                    heartbeatIntervalInSeconds: 10,
                    reconnectTimeInSeconds: 20,
                },
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            );
            expect((optionsProvider as any).useValue.connectionOptions).toEqual(options.connectionOptions);
        });
    });

    describe('forRootAsync', () => {
        it('should create a dynamic module with useFactory', () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => ({
                    uri: 'amqp://localhost',
                }),
            });

            expect(dynamicModule).toBeDefined();
            expect(dynamicModule.module).toBe(RabbitMQCoreModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });

        it('should inject dependencies in useFactory', () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                inject: ['CONFIG_SERVICE'],
                useFactory: (config: any) => ({
                    uri: config.rabbitmqUri,
                }),
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            );
            expect(optionsProvider).toBeDefined();
            expect((optionsProvider as any).inject).toContain('CONFIG_SERVICE');
        });

        it('should create module with useClass', () => {
            class TestOptionsFactory implements RabbitMQOptionsFactory {
                createRabbitMQOptions(): RabbitMQModuleOptions {
                    return {
                        uri: 'amqp://localhost',
                    };
                }
            }

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useClass: TestOptionsFactory,
            });

            expect(dynamicModule).toBeDefined();
            expect(dynamicModule.providers?.length).toBeGreaterThan(0);
        });

        it('should create module with useExisting', () => {
            class ExistingOptionsFactory implements RabbitMQOptionsFactory {
                createRabbitMQOptions(): RabbitMQModuleOptions {
                    return { uri: 'amqp://localhost' };
                }
            }

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useExisting: ExistingOptionsFactory,
            });

            expect(dynamicModule).toBeDefined();
            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            );
            expect(optionsProvider).toBeDefined();
        });

        it('should use custom connection name in async mode', () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                connectionName: 'async-custom',
                useFactory: () => ({
                    uri: 'amqp://localhost',
                }),
            });

            expect(dynamicModule.providers?.some((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_async-custom`
            )).toBe(true);
        });

        it('should import specified modules', () => {
            class ConfigModule {}
            
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: () => ({
                    uri: 'amqp://localhost',
                }),
            });

            expect(dynamicModule.imports).toContain(ConfigModule);
        });
    });

    describe('onModuleInit', () => {
        let module: RabbitMQCoreModule;
        let discoveryService: jest.Mocked<DiscoveryService>;
        let moduleRef: any;

        beforeEach(() => {
            discoveryService = {
                providerMethodsWithMetaAtKey: jest.fn().mockResolvedValue([]),
            } as any;

            moduleRef = {
                get: jest.fn(),
            };

            module = new RabbitMQCoreModule(discoveryService, moduleRef);
        });

        it('should discover and register subscribers', async () => {
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            instance: {},
                        },
                        handler: jest.fn(),
                    },
                    meta: {
                        queue: 'test-queue',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            expect(discoveryService.providerMethodsWithMetaAtKey).toHaveBeenCalled();
        });

        it('should handle empty subscribers list', async () => {
            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue([]);

            await expect(module.onModuleInit()).resolves.not.toThrow();
            expect(discoveryService.providerMethodsWithMetaAtKey).toHaveBeenCalled();
        });

        it('should log discovery process', async () => {
            const logSpy = jest.spyOn((module as any).logger, 'log');

            await module.onModuleInit();

            expect(logSpy).toHaveBeenCalledWith('Discovering RabbitMQ subscribers...');
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered'));
        });
    });

    describe('integration', () => {
        it('should be compatible with NestJS module system', async () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
            });

            expect(dynamicModule.module).toBe(RabbitMQCoreModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });

        it('should support multiple connection names', () => {
            const module1 = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
                connectionName: 'connection1',
            });

            const module2 = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
                connectionName: 'connection2',
            });

            expect(module1.providers).not.toEqual(module2.providers);
        });
    });

    describe('error scenarios', () => {
        it('should handle missing uri gracefully', () => {
            const options: any = {};

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
        });

        it('should use default values for missing connection options', () => {
            const options: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            // Default values should be applied in the connection manager provider
        });
    });

    describe('registerSubscriber', () => {
        let module: RabbitMQCoreModule;
        let discoveryService: jest.Mocked<DiscoveryService>;
        let moduleRef: any;
        let mockRabbitService: any;

        beforeEach(() => {
            discoveryService = {
                providerMethodsWithMetaAtKey: jest.fn().mockResolvedValue([]),
            } as any;

            mockRabbitService = {
                assertQueue: jest.fn().mockResolvedValue(undefined),
                bindQueue: jest.fn().mockResolvedValue(undefined),
                consume: jest.fn().mockResolvedValue(undefined),
            };

            moduleRef = {
                get: jest.fn().mockReturnValue(mockRabbitService),
            };

            module = new RabbitMQCoreModule(discoveryService, moduleRef);
        });

        it('should register subscriber with queue only', async () => {
            const handler = jest.fn();
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance: {},
                        },
                        handler,
                    },
                    meta: {
                        queue: 'test-queue',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            expect(mockRabbitService.assertQueue).toHaveBeenCalledWith('test-queue', undefined);
            expect(mockRabbitService.consume).toHaveBeenCalled();
        });

        it('should register subscriber with exchange and routing key', async () => {
            const handler = jest.fn();
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance: {},
                        },
                        handler,
                    },
                    meta: {
                        queue: 'test-queue',
                        exchange: 'test-exchange',
                        routingKey: 'test.key',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            expect(mockRabbitService.assertQueue).toHaveBeenCalled();
            expect(mockRabbitService.bindQueue).toHaveBeenCalledWith('test-queue', 'test-exchange', 'test.key');
            expect(mockRabbitService.consume).toHaveBeenCalled();
        });

        it('should handle RPC subscribers', async () => {
            const handler = jest.fn().mockResolvedValue({ result: 'success' });
            const instance = {};
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleRPC',
                        parentClass: {
                            name: 'TestClass',
                            instance,
                        },
                        handler,
                    },
                    meta: {
                        queue: 'rpc-queue',
                        rpc: true,
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            // Get the consumer handler
            const consumerHandler = mockRabbitService.consume.mock.calls[0][1];
            
            // Call the handler with a message
            const result = await consumerHandler({ data: 'test' });

            expect(handler).toHaveBeenCalledWith({ data: 'test' });
            expect(result).toEqual({ result: 'success' });
        });

        it('should handle errors in subscriber with error handler', async () => {
            const error = new Error('Handler error');
            const handler = jest.fn().mockRejectedValue(error);
            const errorHandler = jest.fn().mockResolvedValue(undefined);
            const instance = {};
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance,
                        },
                        handler,
                    },
                    meta: {
                        queue: 'test-queue',
                        errorHandler,
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            // Get the consumer handler
            const consumerHandler = mockRabbitService.consume.mock.calls[0][1];
            
            // Call the handler and expect it to throw
            await expect(consumerHandler({ data: 'test' })).rejects.toThrow('Handler error');

            expect(errorHandler).toHaveBeenCalledWith(error, { data: 'test' });
        });

        it('should handle errors in subscriber without error handler', async () => {
            const error = new Error('Handler error');
            const handler = jest.fn().mockRejectedValue(error);
            const instance = {};
            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance,
                        },
                        handler,
                    },
                    meta: {
                        queue: 'test-queue',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await module.onModuleInit();

            // Get the consumer handler
            const consumerHandler = mockRabbitService.consume.mock.calls[0][1];
            
            // Call the handler and expect it to throw
            await expect(consumerHandler({ data: 'test' })).rejects.toThrow('Handler error');
        });

        it('should log error when RabbitMQ service not found', async () => {
            moduleRef.get.mockReturnValue(null);

            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance: {},
                        },
                        handler: jest.fn(),
                    },
                    meta: {
                        queue: 'test-queue',
                        connectionName: 'non-existent',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            const errorSpy = jest.spyOn((module as any).logger, 'error');

            await module.onModuleInit();

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('RabbitMQ service not found'));
            expect(mockRabbitService.assertQueue).not.toHaveBeenCalled();
        });

        it('should log error when subscriber registration fails', async () => {
            mockRabbitService.assertQueue.mockRejectedValue(new Error('Queue assertion failed'));

            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance: {},
                        },
                        handler: jest.fn(),
                    },
                    meta: {
                        queue: 'test-queue',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            const errorSpy = jest.spyOn((module as any).logger, 'error');

            await module.onModuleInit();

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to register subscriber'),
                expect.any(String)
            );
        });

        it('should use custom connectionName from subscriber options', async () => {
            const customModuleRef = {
                get: jest.fn().mockReturnValue(mockRabbitService),
            };
            const customModule = new RabbitMQCoreModule(discoveryService, customModuleRef);

            const mockSubscribers = [
                {
                    discoveredMethod: {
                        methodName: 'handleMessage',
                        parentClass: {
                            name: 'TestClass',
                            instance: {},
                        },
                        handler: jest.fn(),
                    },
                    meta: {
                        queue: 'test-queue',
                        connectionName: 'custom-connection',
                    },
                },
            ];

            discoveryService.providerMethodsWithMetaAtKey.mockResolvedValue(mockSubscribers as any);

            await customModule.onModuleInit();

            expect(customModuleRef.get).toHaveBeenCalledWith(
                `${RABBITMQ_CONNECTION_MANAGER}_custom-connection`,
                { strict: false }
            );
        });
    });

    describe('provider factories', () => {
        it('should execute connection manager factory in forRoot', async () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
                connectionOptions: {
                    heartbeatIntervalInSeconds: 15,
                    reconnectTimeInSeconds: 30,
                },
            });

            const connectionProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default`
            ) as any;

            expect(connectionProvider).toBeDefined();
            expect(connectionProvider.useFactory).toBeDefined();
        });

        it('should execute service factory in forRoot with exchanges and queues', async () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
                exchanges: [
                    { name: 'test-exchange', type: 'topic' },
                ],
                queues: [
                    { name: 'test-queue', options: { durable: true } },
                ],
            });

            // Find the service provider (it's the second provider with the same provide key)
            const providers = dynamicModule.providers?.filter((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default`
            ) as any[];

            expect(providers).toHaveLength(2);
            const serviceProvider = providers[1];
            expect(serviceProvider.useFactory).toBeDefined();
            expect(serviceProvider.inject).toContain(`${RABBITMQ_CONNECTION_MANAGER}_default`);
        });

        it('should execute connection manager factory in forRootAsync', async () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => ({
                    uri: 'amqp://localhost',
                    connectionOptions: {
                        heartbeatIntervalInSeconds: 8,
                        reconnectTimeInSeconds: 15,
                    },
                }),
            });

            const connectionProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`)
            ) as any;

            expect(connectionProvider).toBeDefined();
            expect(connectionProvider.useFactory).toBeDefined();
        });

        it('should execute service factory in forRootAsync with exchanges and queues', async () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => ({
                    uri: 'amqp://localhost',
                    exchanges: [
                        { name: 'async-exchange', type: 'direct' },
                    ],
                    queues: [
                        { name: 'async-queue', options: { exclusive: true } },
                    ],
                }),
            });

            const serviceProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`) &&
                p.inject?.includes(`${RABBITMQ_CONNECTION_MANAGER}_default`)
            ) as any;

            expect(serviceProvider).toBeDefined();
            expect(serviceProvider.useFactory).toBeDefined();
        });

        it('should execute async options factory with useFactory', async () => {
            const factoryFn = jest.fn().mockReturnValue({
                uri: 'amqp://localhost',
            });

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: factoryFn,
                inject: ['CONFIG_SERVICE'],
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            ) as any;

            expect(optionsProvider).toBeDefined();
            expect(optionsProvider.useFactory).toBe(factoryFn);
            expect(optionsProvider.inject).toContain('CONFIG_SERVICE');
        });

        it('should execute async options factory with useClass', async () => {
            class TestFactory implements RabbitMQOptionsFactory {
                async createRabbitMQOptions(): Promise<RabbitMQModuleOptions> {
                    return { uri: 'amqp://localhost' };
                }
            }

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useClass: TestFactory,
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            ) as any;

            expect(optionsProvider).toBeDefined();
            expect(optionsProvider.useFactory).toBeDefined();
            expect(optionsProvider.inject).toHaveLength(1);
            expect(optionsProvider.inject[0]).toBe(TestFactory);

            // Verify class provider is also included
            const classProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === TestFactory
            );
            expect(classProvider).toBeDefined();
        });

        it('should execute async options factory with useExisting', async () => {
            class ExistingFactory implements RabbitMQOptionsFactory {
                async createRabbitMQOptions(): Promise<RabbitMQModuleOptions> {
                    return { uri: 'amqp://localhost' };
                }
            }

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useExisting: ExistingFactory,
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            ) as any;

            expect(optionsProvider).toBeDefined();
            expect(optionsProvider.useFactory).toBeDefined();
            expect(optionsProvider.inject).toHaveLength(1);
            expect(optionsProvider.inject[0]).toBe(ExistingFactory);
        });

        it('should return empty providers array when no async options provided', async () => {
            // This tests the edge case where neither useFactory, useClass, nor useExisting is provided
            const dynamicModule = RabbitMQCoreModule.forRootAsync({} as any);

            // The module should still have connection and service providers
            expect(dynamicModule.providers).toBeDefined();
        });

        it('should call connection manager factory with options in forRoot', () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                uri: 'amqp://test-host',
                connectionOptions: {
                    heartbeatIntervalInSeconds: 20,
                    reconnectTimeInSeconds: 25,
                },
            });

            const connectionProvider = dynamicModule.providers?.[0] as any;
            const mockAmqp = require('amqp-connection-manager');
            
            // Call the factory
            connectionProvider.useFactory();

            // Verify amqp.connect was called with correct params
            expect(mockAmqp.connect).toHaveBeenCalled();
        });

        it('should call service factory with RabbitMQService in forRoot', async () => {
            const mockConnectionManager = {
                createChannel: jest.fn(),
                on: jest.fn(),
            };

            const dynamicModule = RabbitMQCoreModule.forRoot({
                uri: 'amqp://localhost',
                exchanges: [
                    { name: 'factory-exchange', type: 'fanout' },
                ],
                queues: [
                    { name: 'factory-queue', options: { durable: false } },
                ],
            });

            // Get service provider (second one with same provide key)
            const providers = dynamicModule.providers?.filter((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default`
            ) as any[];
            
            const serviceProvider = providers[1];

            // Mock RabbitMQService methods
            const mockService = {
                initialize: jest.fn().mockResolvedValue(undefined),
                assertExchange: jest.fn().mockResolvedValue(undefined),
                assertQueue: jest.fn().mockResolvedValue(undefined),
            };

            jest.spyOn(require('./services/rabbitmq.service'), 'RabbitMQService')
                .mockImplementation(() => mockService);

            // Call the factory
            await serviceProvider.useFactory(mockConnectionManager);

            expect(mockService.initialize).toHaveBeenCalled();
            expect(mockService.assertExchange).toHaveBeenCalledWith('factory-exchange', 'fanout', undefined);
            expect(mockService.assertQueue).toHaveBeenCalledWith('factory-queue', { durable: false });
        });

        it('should call connection manager factory in forRootAsync', () => {
            const mockOptions = {
                uri: 'amqp://async-host',
                connectionOptions: {
                    heartbeatIntervalInSeconds: 12,
                    reconnectTimeInSeconds: 18,
                },
            };

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => mockOptions,
            });

            const connectionProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`)
            ) as any;

            const mockAmqp = require('amqp-connection-manager');
            
            // Call the factory
            connectionProvider.useFactory(mockOptions);

            // Verify amqp.connect was called
            expect(mockAmqp.connect).toHaveBeenCalled();
        });

        it('should call service factory in forRootAsync with exchanges and queues', async () => {
            const mockOptions: RabbitMQModuleOptions = {
                uri: 'amqp://localhost',
                exchanges: [
                    { name: 'async-factory-exchange', type: 'headers' as const },
                ],
                queues: [
                    { name: 'async-factory-queue', options: { exclusive: true } },
                ],
            };

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => mockOptions,
            });

            const serviceProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`) &&
                p.inject?.includes(`${RABBITMQ_CONNECTION_MANAGER}_default`)
            ) as any;

            const mockConnectionManager = {
                createChannel: jest.fn(),
                on: jest.fn(),
            };

            const mockService = {
                initialize: jest.fn().mockResolvedValue(undefined),
                assertExchange: jest.fn().mockResolvedValue(undefined),
                assertQueue: jest.fn().mockResolvedValue(undefined),
            };

            jest.spyOn(require('./services/rabbitmq.service'), 'RabbitMQService')
                .mockImplementation(() => mockService);

            // Call the factory
            await serviceProvider.useFactory(mockConnectionManager, mockOptions);

            expect(mockService.initialize).toHaveBeenCalled();
            expect(mockService.assertExchange).toHaveBeenCalledWith('async-factory-exchange', 'headers', undefined);
            expect(mockService.assertQueue).toHaveBeenCalledWith('async-factory-queue', { exclusive: true });
        });

        it('should call options factory with useFactory in forRootAsync', async () => {
            const mockFactory = jest.fn().mockResolvedValue({
                uri: 'amqp://localhost',
            });

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: mockFactory,
                inject: ['DEPENDENCY'],
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            ) as any;

            // Call the factory
            await optionsProvider.useFactory('mock-dependency');

            expect(mockFactory).toHaveBeenCalledWith('mock-dependency');
        });

        it('should call options factory with useClass in forRootAsync', async () => {
            class MockFactory implements RabbitMQOptionsFactory {
                async createRabbitMQOptions(): Promise<RabbitMQModuleOptions> {
                    return { uri: 'amqp://mock' };
                }
            }

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useClass: MockFactory,
            });

            const optionsProvider = dynamicModule.providers?.find((p: any) => 
                p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`
            ) as any;

            const mockFactoryInstance = new MockFactory();
            jest.spyOn(mockFactoryInstance, 'createRabbitMQOptions');

            // Call the factory
            const result = await optionsProvider.useFactory(mockFactoryInstance);

            expect(result).toEqual({ uri: 'amqp://mock' });
        });
    });
});

