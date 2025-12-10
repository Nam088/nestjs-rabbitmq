import { RABBIT_HANDLER_METADATA } from '../constants';

import { RabbitHandler } from './rabbit-handler.decorator';

import type { RabbitHandlerOptions } from '../interfaces/rabbitmq-options.interface';

import 'reflect-metadata';

describe('RabbitHandler Decorator', () => {
    it('should set metadata on method with queue', () => {
        const options: RabbitHandlerOptions = {
            noAck: false,
            queue: 'test-queue',
        };

        class TestClass {
            @RabbitHandler(options)
            handleMessage() {
                return true;
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.handleMessage);

        expect(metadata).toEqual(options);
    });

    it('should work with exchange and routing key', () => {
        const options: RabbitHandlerOptions = {
            exchange: 'test-exchange',
            routingKey: 'test.routing.key',
        };

        class TestClass {
            @RabbitHandler(options)
            handleExchange() {
                return {};
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.handleExchange);

        expect(metadata.exchange).toBe('test-exchange');
        expect(metadata.routingKey).toBe('test.routing.key');
    });

    it('should work with connection name', () => {
        const options: RabbitHandlerOptions = {
            connectionName: 'custom',
            queue: 'conn-queue',
        };

        class TestClass {
            @RabbitHandler(options)
            multiConnHandler() {
                return null;
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.multiConnHandler);

        expect(metadata.connectionName).toBe('custom');
    });

    it('should work with prefetch count', () => {
        const options: RabbitHandlerOptions = {
            prefetchCount: 5,
            queue: 'prefetch-queue',
        };

        class TestClass {
            @RabbitHandler(options)
            prefetchHandler() {
                return undefined;
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.prefetchHandler);

        expect(metadata.prefetchCount).toBe(5);
    });

    it('should work with empty options', () => {
        const options: RabbitHandlerOptions = {};

        class TestClass {
            @RabbitHandler(options)
            emptyHandler() {
                return 'ok';
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.emptyHandler);

        expect(metadata).toEqual({});
    });

    it('should allow multiple handlers in same class', () => {
        class TestClass {
            @RabbitHandler({ queue: 'queue-a' })
            handlerA() {
                return 'a';
            }

            @RabbitHandler({ exchange: 'exchange-b', routingKey: 'key-b' })
            handlerB() {
                return 'b';
            }

            @RabbitHandler({ connectionName: 'conn-c', queue: 'queue-c' })
            handlerC() {
                return 'c';
            }
        }

        const metadataA = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.handlerA);
        const metadataB = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.handlerB);
        const metadataC = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.handlerC);

        expect(metadataA.queue).toBe('queue-a');
        expect(metadataB.exchange).toBe('exchange-b');
        expect(metadataC.connectionName).toBe('conn-c');
    });

    it('should work with all options combined', () => {
        const options: RabbitHandlerOptions = {
            connectionName: 'full-conn',
            exchange: 'full-exchange',
            noAck: true,
            prefetchCount: 20,
            queue: 'full-queue',
            routingKey: 'full.key',
        };

        class TestClass {
            @RabbitHandler(options)
            fullHandler() {
                return 'complete';
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_HANDLER_METADATA, TestClass.prototype.fullHandler);

        expect(metadata).toEqual(options);
    });
});
