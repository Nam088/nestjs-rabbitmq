import { RABBITMQ_SUBSCRIBE_METADATA } from '../constants';
import { RabbitSubscribe } from './rabbit-subscribe.decorator';

import type { RabbitSubscribeOptions } from '../interfaces/rabbitmq-options.interface';

describe('RabbitSubscribe Decorator', () => {
    it('should set metadata with queue option', () => {
        const options: RabbitSubscribeOptions = {
            queue: 'test-queue',
        };

        class TestClass {
            @RabbitSubscribe(options)
            handleMessage(_message?: any): void {
                // Test method
            }
        }

        const metadata = Reflect.getMetadata(
            RABBITMQ_SUBSCRIBE_METADATA,
            TestClass.prototype.handleMessage,
        );

        expect(metadata).toEqual(options);
    });

    it('should set metadata with exchange option', () => {
        const options: RabbitSubscribeOptions = {
            queue: 'test-queue',
            exchange: 'test-exchange',
            routingKey: 'test.route',
        };

        class TestClass {
            @RabbitSubscribe(options)
            handleMessage(_message?: any): void {
                // Test method
            }
        }

        const metadata = Reflect.getMetadata(
            RABBITMQ_SUBSCRIBE_METADATA,
            TestClass.prototype.handleMessage,
        );

        expect(metadata).toEqual(options);
    });

    it('should set metadata with all options', () => {
        const options: RabbitSubscribeOptions = {
            queue: 'test-queue',
            exchange: 'test-exchange',
            routingKey: 'test.route',
            queueOptions: {
                durable: true,
                exclusive: false,
            },
        };

        class TestClass {
            @RabbitSubscribe(options)
            handleMessage(_message?: any): void {
                // Test method
            }
        }

        const metadata = Reflect.getMetadata(
            RABBITMQ_SUBSCRIBE_METADATA,
            TestClass.prototype.handleMessage,
        );

        expect(metadata).toEqual(options);
    });

    it('should work with multiple decorated methods', () => {
        const options1: RabbitSubscribeOptions = { queue: 'queue-1' };
        const options2: RabbitSubscribeOptions = { queue: 'queue-2' };

        class TestClass {
            @RabbitSubscribe(options1)
            handleMessage1(_message?: any): void {
                // Test method
            }

            @RabbitSubscribe(options2)
            handleMessage2(_message?: any): void {
                // Test method
            }
        }

        const metadata1 = Reflect.getMetadata(
            RABBITMQ_SUBSCRIBE_METADATA,
            TestClass.prototype.handleMessage1,
        );
        const metadata2 = Reflect.getMetadata(
            RABBITMQ_SUBSCRIBE_METADATA,
            TestClass.prototype.handleMessage2,
        );

        expect(metadata1).toEqual(options1);
        expect(metadata2).toEqual(options2);
    });

    it('should preserve method functionality', () => {
        const options: RabbitSubscribeOptions = { queue: 'test-queue' };
        let called = false;

        class TestClass {
            @RabbitSubscribe(options)
            handleMessage(_message?: any): void {
                called = true;
            }
        }

        const instance = new TestClass();
        instance.handleMessage();

        expect(called).toBe(true);
    });
});

