import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { RabbitMQService } from './rabbitmq.service';

import type { AmqpConnectionManager } from 'amqp-connection-manager';

describe('RabbitMQService', () => {
    let service: RabbitMQService;
    let mockConnectionManager: Partial<AmqpConnectionManager>;
    let mockChannel: any;

    beforeEach(async () => {
        mockChannel = {
            ack: jest.fn(),
            assertExchange: jest.fn().mockResolvedValue({ exchange: 'test' }),
            assertQueue: jest.fn().mockResolvedValue({ consumerCount: 0, messageCount: 0, queue: 'test' }),
            bindQueue: jest.fn().mockResolvedValue({}),
            close: jest.fn().mockResolvedValue(undefined),
            consume: jest.fn().mockResolvedValue({ consumerTag: 'test' }),
            nack: jest.fn(),
            publish: jest.fn().mockResolvedValue(true),
            sendToQueue: jest.fn().mockResolvedValue(true),
            waitForConnect: jest.fn().mockResolvedValue(undefined),
        };

        mockConnectionManager = {
            close: jest.fn().mockResolvedValue(undefined),
            createChannel: jest.fn().mockReturnValue(mockChannel),
            isConnected: jest.fn().mockReturnValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: RabbitMQService,
                    useFactory: () => new RabbitMQService(mockConnectionManager as AmqpConnectionManager, 'test'),
                },
            ],
        }).compile();

        service = module.get<RabbitMQService>(RabbitMQService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initialize', () => {
        it('should initialize the channel', async () => {
            await service.initialize();
            expect(mockConnectionManager.createChannel).toHaveBeenCalled();
            expect(mockChannel.waitForConnect).toHaveBeenCalled();
        });
    });

    describe('publish', () => {
        it('should publish a message to an exchange', async () => {
            await service.initialize();
            const result = await service.publish('test-exchange', 'test.key', { data: 'test' });

            expect(result).toBe(true);
            expect(mockChannel.publish).toHaveBeenCalledWith(
                'test-exchange',
                'test.key',
                expect.any(Buffer),
                expect.objectContaining({ persistent: true }),
            );
        });

        it('should serialize object messages to JSON', async () => {
            await service.initialize();
            const message = { action: 'created', userId: 123 };

            await service.publish('events', 'user.created', message);

            expect(mockChannel.publish).toHaveBeenCalledWith(
                'events',
                'user.created',
                Buffer.from(JSON.stringify(message)),
                expect.any(Object),
            );
        });
    });

    describe('sendToQueue', () => {
        it('should send a message directly to a queue', async () => {
            await service.initialize();
            const result = await service.sendToQueue('test-queue', { data: 'test' });

            expect(result).toBe(true);
            expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                'test-queue',
                expect.any(Buffer),
                expect.objectContaining({ persistent: true }),
            );
        });
    });

    describe('assertExchange', () => {
        it('should assert an exchange', async () => {
            await service.initialize();
            await service.assertExchange('test-exchange', 'topic');

            expect(mockChannel.assertExchange).toHaveBeenCalledWith(
                'test-exchange',
                'topic',
                expect.objectContaining({ durable: true }),
            );
        });
    });

    describe('assertQueue', () => {
        it('should assert a queue', async () => {
            await service.initialize();
            await service.assertQueue('test-queue');

            expect(mockChannel.assertQueue).toHaveBeenCalledWith(
                'test-queue',
                expect.objectContaining({ durable: true }),
            );
        });
    });

    describe('bindQueue', () => {
        it('should bind a queue to an exchange', async () => {
            await service.initialize();
            await service.bindQueue('test-queue', 'test-exchange', 'test.key');

            expect(mockChannel.bindQueue).toHaveBeenCalledWith('test-queue', 'test-exchange', 'test.key');
        });
    });

    describe('isConnected', () => {
        it('should return connection status', () => {
            const isConnected = service.isConnected();

            expect(isConnected).toBe(true);
            expect(mockConnectionManager.isConnected).toHaveBeenCalled();
        });
    });

    describe('close', () => {
        it('should close the channel and connection', async () => {
            await service.initialize();
            await service.close();

            expect(mockChannel.close).toHaveBeenCalled();
            expect(mockConnectionManager.close).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle publish errors', async () => {
            await service.initialize();
            mockChannel.publish.mockRejectedValue(new Error('Publish failed'));

            await expect(service.publish('test-exchange', 'test.key', { data: 'test' })).rejects.toThrow(
                'Publish failed',
            );
        });

        it('should handle sendToQueue errors', async () => {
            await service.initialize();
            mockChannel.sendToQueue.mockRejectedValue(new Error('Send failed'));

            await expect(service.sendToQueue('test-queue', { data: 'test' })).rejects.toThrow('Send failed');
        });
    });

    describe('consume', () => {
        it('should consume messages from a queue', async () => {
            await service.initialize();
            const onMessage = jest.fn();

            await service.consume('test-queue', onMessage);

            expect(mockChannel.consume).toHaveBeenCalledWith(
                'test-queue',
                expect.any(Function),
                expect.objectContaining({ noAck: false }),
            );
        });

        it('should process and ack messages', async () => {
            await service.initialize();
            const onMessage = jest.fn().mockResolvedValue(undefined);
            let messageHandler: any;

            mockChannel.consume.mockImplementation((queue: string, handler: any) => {
                messageHandler = handler;

                return Promise.resolve({ consumerTag: 'test' });
            });

            await service.consume('test-queue', onMessage);

            const mockMessage = {
                content: Buffer.from(JSON.stringify({ data: 'test' })),
                fields: {},
                properties: {},
            };

            await messageHandler(mockMessage);

            expect(onMessage).toHaveBeenCalledWith({ data: 'test' });
            expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
        });

        it('should nack messages on error', async () => {
            await service.initialize();
            const onMessage = jest.fn().mockRejectedValue(new Error('Processing failed'));
            let messageHandler: any;

            mockChannel.consume.mockImplementation((queue: string, handler: any) => {
                messageHandler = handler;

                return Promise.resolve({ consumerTag: 'test' });
            });

            await service.consume('test-queue', onMessage);

            const mockMessage = {
                content: Buffer.from(JSON.stringify({ data: 'test' })),
                fields: {},
                properties: {},
            };

            await messageHandler(mockMessage);

            expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
        });

        it('should handle null messages', async () => {
            await service.initialize();
            const onMessage = jest.fn();
            let messageHandler: any;

            mockChannel.consume.mockImplementation((queue: string, handler: any) => {
                messageHandler = handler;

                return Promise.resolve({ consumerTag: 'test' });
            });

            await service.consume('test-queue', onMessage);
            await messageHandler(null);

            expect(onMessage).not.toHaveBeenCalled();
        });

        it('should deserialize non-JSON messages as strings', async () => {
            await service.initialize();
            const onMessage = jest.fn().mockResolvedValue(undefined);
            let messageHandler: any;

            mockChannel.consume.mockImplementation((queue: string, handler: any) => {
                messageHandler = handler;

                return Promise.resolve({ consumerTag: 'test' });
            });

            await service.consume('test-queue', onMessage);

            const mockMessage = {
                content: Buffer.from('plain text'),
                fields: {},
                properties: {},
            };

            await messageHandler(mockMessage);

            expect(onMessage).toHaveBeenCalledWith('plain text');
            expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
        });
    });

    describe('request (RPC)', () => {
        beforeEach(() => {
            mockChannel.consume.mockImplementation((queue: string, handler: any) =>
                Promise.resolve({ consumerTag: 'test' }),
            );
        });

        it('should make RPC request and receive response', async () => {
            await service.initialize();

            let replyHandler: any;

            mockChannel.consume.mockImplementation((queue: string, handler: any) => {
                replyHandler = handler;

                return Promise.resolve({ consumerTag: 'test' });
            });

            const requestPromise = service.request('rpc-queue', { action: 'test' });

            // Wait for consume to be called
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Simulate reply
            const replyMessage = {
                content: Buffer.from(JSON.stringify({ result: 'success' })),
                properties: {
                    correlationId: expect.any(String),
                },
            };

            if (replyHandler) {
                // Get the actual correlationId from the sendToQueue call
                const sendCall = mockChannel.sendToQueue.mock.calls.find((call: any) => call[0] === 'rpc-queue');

                if (sendCall && sendCall[2]?.correlationId) {
                    replyMessage.properties.correlationId = sendCall[2].correlationId;
                    await replyHandler(replyMessage);
                }
            }

            const result = await requestPromise;

            expect(result).toEqual({ result: 'success' });
        });

        it('should timeout on RPC request', async () => {
            await service.initialize();

            // Use a very short timeout for testing
            const requestPromise = service.request('rpc-queue', { action: 'test' }, { timeout: 10 });

            await expect(requestPromise).rejects.toThrow('RPC timeout after 10ms');
        }, 1000);

        it('should handle RPC request errors', async () => {
            await service.initialize();
            mockChannel.sendToQueue.mockRejectedValue(new Error('Send failed'));

            await expect(service.request('rpc-queue', { action: 'test' })).rejects.toThrow('Send failed');
        });

        it('should handle non-Error rejections in RPC', async () => {
            await service.initialize();
            mockChannel.sendToQueue.mockRejectedValue('string error');

            await expect(service.request('rpc-queue', { action: 'test' })).rejects.toThrow('string error');
        });
    });

    describe('message serialization', () => {
        it('should handle Buffer messages', async () => {
            await service.initialize();
            const buffer = Buffer.from('test data');

            await service.sendToQueue('test-queue', buffer);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith('test-queue', buffer, expect.any(Object));
        });

        it('should handle string messages', async () => {
            await service.initialize();
            await service.sendToQueue('test-queue', 'test string');

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                'test-queue',
                Buffer.from('test string'),
                expect.any(Object),
            );
        });

        it('should handle object messages', async () => {
            await service.initialize();
            const obj = { key: 'value', nested: { data: 123 } };

            await service.sendToQueue('test-queue', obj);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                'test-queue',
                Buffer.from(JSON.stringify(obj)),
                expect.any(Object),
            );
        });
    });

    describe('channel setup', () => {
        it('should configure channel with prefetch during initialization', async () => {
            const mockConfirmChannel = {
                prefetch: jest.fn().mockResolvedValue(undefined),
            };

            let setupCallback: any;

            mockConnectionManager.createChannel = jest.fn().mockImplementation((options: any) => {
                setupCallback = options.setup;

                return mockChannel;
            });

            await service.initialize();

            expect(mockConnectionManager.createChannel).toHaveBeenCalledWith(
                expect.objectContaining({
                    json: false,
                    setup: expect.any(Function),
                }),
            );

            // Execute setup callback
            if (setupCallback) {
                await setupCallback(mockConfirmChannel);
                expect(mockConfirmChannel.prefetch).toHaveBeenCalledWith(1);
            }
        });
    });
});
