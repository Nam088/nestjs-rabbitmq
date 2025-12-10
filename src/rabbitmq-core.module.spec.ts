import type { RabbitMQModuleOptions, RabbitMQOptionsFactory } from './interfaces/rabbitmq-options.interface';

import { RABBITMQ_CONNECTION_MANAGER, RABBITMQ_MODULE_OPTIONS, RABBITMQ_SERVICE } from './constants';
import { RabbitMQCoreModule } from './rabbitmq-core.module';

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
                connectionName: 'custom',
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule.providers).toHaveLength(3);
            expect(
                dynamicModule.providers?.some((p: any) => p.provide === `${RABBITMQ_CONNECTION_MANAGER}_custom`),
            ).toBe(true);
        });

        it('should include exchanges in options', () => {
            const options: RabbitMQModuleOptions = {
                exchanges: [{ name: 'test-exchange', type: 'topic' }],
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
            );

            expect(optionsProvider).toBeDefined();
            expect((optionsProvider as any).useValue.exchanges).toEqual(options.exchanges);
        });

        it('should include queues in options', () => {
            const options: RabbitMQModuleOptions = {
                queues: [{ name: 'test-queue', options: { durable: true } }],
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
            );

            expect((optionsProvider as any).useValue.queues).toEqual(options.queues);
        });

        it('should include service discovery provider when enabled', () => {
            const options: RabbitMQModuleOptions = {
                serviceDiscovery: {
                    enabled: true,
                    serviceName: 'test-service',
                },
                uri: 'amqp://localhost',
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
                connectionOptions: {
                    heartbeatIntervalInSeconds: 10,
                    reconnectTimeInSeconds: 20,
                },
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRoot(options);

            expect(dynamicModule).toBeDefined();
            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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
            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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

            expect(
                dynamicModule.providers?.some((p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_async-custom`),
            ).toBe(true);
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

    // Note: onModuleInit tests have been moved to 'internal discovery' describe block
    // which uses the new MetadataScanner-based implementation

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
                connectionName: 'connection1',
                uri: 'amqp://localhost',
            });

            const module2 = RabbitMQCoreModule.forRoot({
                connectionName: 'connection2',
                uri: 'amqp://localhost',
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

    // Note: registerSubscriber tests have been moved to 'internal discovery' describe block
    // which uses the new MetadataScanner-based implementation

    describe('provider factories', () => {
        it('should execute connection manager factory in forRoot', async () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                connectionOptions: {
                    heartbeatIntervalInSeconds: 15,
                    reconnectTimeInSeconds: 30,
                },
                uri: 'amqp://localhost',
            });

            const connectionProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default`,
            ) as any;

            expect(connectionProvider).toBeDefined();
            expect(connectionProvider.useFactory).toBeDefined();
        });

        it('should execute service factory in forRoot with exchanges and queues', async () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                exchanges: [{ name: 'test-exchange', type: 'topic' }],
                queues: [{ name: 'test-queue', options: { durable: true } }],
                uri: 'amqp://localhost',
            });

            // Find the service provider by its token
            const serviceProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_SERVICE}_default`,
            ) as any;

            expect(serviceProvider.useFactory).toBeDefined();
            expect(serviceProvider.inject).toContain(`${RABBITMQ_CONNECTION_MANAGER}_default`);
        });

        it('should execute connection manager factory in forRootAsync', async () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => ({
                    connectionOptions: {
                        heartbeatIntervalInSeconds: 8,
                        reconnectTimeInSeconds: 15,
                    },
                    uri: 'amqp://localhost',
                }),
            });

            const connectionProvider = dynamicModule.providers?.find(
                (p: any) =>
                    p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                    p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`),
            ) as any;

            expect(connectionProvider).toBeDefined();
            expect(connectionProvider.useFactory).toBeDefined();
        });

        it('should execute service factory in forRootAsync with exchanges and queues', async () => {
            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => ({
                    exchanges: [{ name: 'async-exchange', type: 'direct' }],
                    queues: [{ name: 'async-queue', options: { exclusive: true } }],
                    uri: 'amqp://localhost',
                }),
            });

            const serviceProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_SERVICE}_default`,
            ) as any;

            expect(serviceProvider).toBeDefined();
            expect(serviceProvider.useFactory).toBeDefined();
        });

        it('should execute async options factory with useFactory', async () => {
            const factoryFn = jest.fn().mockReturnValue({
                uri: 'amqp://localhost',
            });

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                inject: ['CONFIG_SERVICE'],
                useFactory: factoryFn,
            });

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
            ) as any;

            expect(optionsProvider).toBeDefined();
            expect(optionsProvider.useFactory).toBeDefined();
            expect(optionsProvider.inject).toHaveLength(1);
            expect(optionsProvider.inject[0]).toBe(TestFactory);

            // Verify class provider is also included
            const classProvider = dynamicModule.providers?.find((p: any) => p.provide === TestFactory);

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

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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

        it('should expose connection manager factory in forRoot', () => {
            const dynamicModule = RabbitMQCoreModule.forRoot({
                connectionOptions: {
                    heartbeatIntervalInSeconds: 20,
                    reconnectTimeInSeconds: 25,
                },
                uri: 'amqp://test-host',
            });

            const connectionProvider = dynamicModule.providers?.[0] as any;

            expect(typeof connectionProvider.useFactory).toBe('function');
        });

        it('should call service factory with RabbitMQService in forRoot', async () => {
            const mockConnectionManager = {
                createChannel: jest.fn(),
                on: jest.fn(),
            };

            const dynamicModule = RabbitMQCoreModule.forRoot({
                exchanges: [{ name: 'factory-exchange', type: 'fanout' }],
                queues: [{ name: 'factory-queue', options: { durable: false } }],
                uri: 'amqp://localhost',
            });

            // Get service provider by token
            const serviceProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_SERVICE}_default`,
            ) as any;

            // Mock RabbitMQService methods
            const mockService = {
                assertExchange: jest.fn().mockResolvedValue(undefined),
                assertQueue: jest.fn().mockResolvedValue(undefined),
                initialize: jest.fn().mockResolvedValue(undefined),
            };

            jest.spyOn(require('./services/rabbitmq.service'), 'RabbitMQService').mockImplementation(() => mockService);

            // Call the factory
            await serviceProvider.useFactory(mockConnectionManager);

            expect(mockService.initialize).toHaveBeenCalled();
            expect(mockService.assertExchange).toHaveBeenCalledWith('factory-exchange', 'fanout', undefined);
            expect(mockService.assertQueue).toHaveBeenCalledWith('factory-queue', { durable: false });
        });

        it('should expose connection manager factory in forRootAsync', () => {
            const mockOptions = {
                connectionOptions: {
                    heartbeatIntervalInSeconds: 12,
                    reconnectTimeInSeconds: 18,
                },
                uri: 'amqp://async-host',
            };

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => mockOptions,
            });

            const connectionProvider = dynamicModule.providers?.find(
                (p: any) =>
                    p.provide === `${RABBITMQ_CONNECTION_MANAGER}_default` &&
                    p.inject?.includes(`${RABBITMQ_MODULE_OPTIONS}_default`),
            ) as any;

            expect(typeof connectionProvider.useFactory).toBe('function');
        });

        it('should call service factory in forRootAsync with exchanges and queues', async () => {
            const mockOptions: RabbitMQModuleOptions = {
                exchanges: [{ name: 'async-factory-exchange', type: 'headers' as const }],
                queues: [{ name: 'async-factory-queue', options: { exclusive: true } }],
                uri: 'amqp://localhost',
            };

            const dynamicModule = RabbitMQCoreModule.forRootAsync({
                useFactory: () => mockOptions,
            });

            const serviceProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_SERVICE}_default`,
            ) as any;

            const mockConnectionManager = {
                createChannel: jest.fn(),
                on: jest.fn(),
            };

            const mockService = {
                assertExchange: jest.fn().mockResolvedValue(undefined),
                assertQueue: jest.fn().mockResolvedValue(undefined),
                initialize: jest.fn().mockResolvedValue(undefined),
            };

            jest.spyOn(require('./services/rabbitmq.service'), 'RabbitMQService').mockImplementation(() => mockService);

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
                inject: ['DEPENDENCY'],
                useFactory: mockFactory,
            });

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
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

            const optionsProvider = dynamicModule.providers?.find(
                (p: any) => p.provide === `${RABBITMQ_MODULE_OPTIONS}_default`,
            ) as any;

            const mockFactoryInstance = new MockFactory();

            jest.spyOn(mockFactoryInstance, 'createRabbitMQOptions');

            // Call the factory
            const result = await optionsProvider.useFactory(mockFactoryInstance);

            expect(result).toEqual({ uri: 'amqp://mock' });
        });

        describe('internal discovery', () => {
            it('should discover @RabbitSubscribe and register consumer', async () => {
                const mockRabbitService = {
                    assertQueue: jest.fn().mockResolvedValue(undefined),
                    bindQueue: jest.fn().mockResolvedValue(undefined),
                    consume: jest.fn().mockResolvedValue(undefined),
                };

                const moduleRef: any = {
                    get: jest.fn().mockReturnValue(mockRabbitService),
                };

                class TestProvider {
                    handler(_: any) {
                        /* noop */
                    }
                }

                // Attach subscribe metadata on the method function
                const SUBSCRIBE_KEY = 'RABBITMQ_SUBSCRIBE_METADATA';

                Reflect.defineMetadata(
                    SUBSCRIBE_KEY,
                    { exchange: 'ex', queue: 'q1', routingKey: 'rk' },
                    TestProvider.prototype.handler,
                );

                const providerRecord: any = { instance: new TestProvider() };
                const fakeNestModule: any = { providers: new Map([[Symbol('prov'), providerRecord]]) };
                const modulesContainer: any = { values: () => [fakeNestModule] };

                const core = new RabbitMQCoreModule(moduleRef, modulesContainer);

                await core.onApplicationBootstrap();

                expect(moduleRef.get).toHaveBeenCalled();
                expect(mockRabbitService.assertQueue).toHaveBeenCalledWith('q1', undefined);
                expect(mockRabbitService.bindQueue).toHaveBeenCalledWith('q1', 'ex', 'rk');
                expect(mockRabbitService.consume).toHaveBeenCalled();
            });

            it('should discover @RabbitRPC and register rpc handler', async () => {
                const channel = {
                    ack: jest.fn(),
                    consume: jest.fn().mockResolvedValue(undefined),
                    nack: jest.fn(),
                    sendToQueue: jest.fn(),
                } as any;
                const mockRabbitService = {
                    assertQueue: jest.fn().mockResolvedValue(undefined),
                    getChannel: jest.fn().mockReturnValue(channel),
                } as any;

                const moduleRef: any = { get: jest.fn().mockReturnValue(mockRabbitService) };

                class TestProvider {
                    rpc(_: any) {
                        return { ok: true };
                    }
                }

                const RPC_KEY = 'RABBIT_RPC_METADATA';

                Reflect.defineMetadata(RPC_KEY, { prefetchCount: 1, queue: 'rpc-q' }, TestProvider.prototype.rpc);

                const providerRecord: any = { instance: new TestProvider() };
                const fakeNestModule: any = { providers: new Map([[Symbol('prov'), providerRecord]]) };
                const modulesContainer: any = { values: () => [fakeNestModule] };

                const core = new RabbitMQCoreModule(moduleRef, modulesContainer);

                await core.onApplicationBootstrap();

                expect(moduleRef.get).toHaveBeenCalled();
                expect(mockRabbitService.assertQueue).toHaveBeenCalledWith('rpc-q', undefined);
                expect(channel.consume).toHaveBeenCalled();
            });

            it('should log error if RabbitMQService not found', async () => {
                const moduleRef: any = { get: jest.fn().mockReturnValue(undefined) };

                class P {
                    h(_: any) {}
                }

                const SUBSCRIBE_KEY = 'RABBITMQ_SUBSCRIBE_METADATA';

                Reflect.defineMetadata(SUBSCRIBE_KEY, { queue: 'q1' }, P.prototype.h);

                const providerRecord: any = { instance: new P() };
                const fakeNestModule: any = { providers: new Map([[Symbol('prov'), providerRecord]]) };
                const modulesContainer: any = { values: () => [fakeNestModule] };

                const core: any = new RabbitMQCoreModule(moduleRef, modulesContainer);
                const errorSpy = jest.spyOn(core['logger'], 'error').mockImplementation(() => undefined as any);

                await core.onApplicationBootstrap();
                expect(errorSpy).toHaveBeenCalled();
            });
        });
    });
});
