import { RABBIT_RPC_METADATA } from '../constants';

import { RabbitRPC } from './rabbit-rpc.decorator';

import type { RabbitRPCOptions } from '../interfaces/rabbitmq-options.interface';

import 'reflect-metadata';

describe('RabbitRPC Decorator', () => {
    it('should set metadata on method', () => {
        const options: RabbitRPCOptions = {
            noAck: false,
            prefetchCount: 1,
            queue: 'test-rpc-queue',
        };

        class TestClass {
            @RabbitRPC(options)
            handleRPC() {
                return 'response';
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.handleRPC);

        expect(metadata).toEqual(options);
    });

    it('should work with minimal options', () => {
        const options: RabbitRPCOptions = {
            queue: 'simple-queue',
        };

        class TestClass {
            @RabbitRPC(options)
            simpleHandler() {
                return true;
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.simpleHandler);

        expect(metadata).toEqual(options);
        expect(metadata.queue).toBe('simple-queue');
    });

    it('should work with connection name', () => {
        const options: RabbitRPCOptions = {
            connectionName: 'secondary',
            queue: 'multi-conn-queue',
        };

        class TestClass {
            @RabbitRPC(options)
            multiConnHandler() {
                return {};
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.multiConnHandler);

        expect(metadata.connectionName).toBe('secondary');
    });

    it('should work with prefetch settings', () => {
        const options: RabbitRPCOptions = {
            noAck: true,
            prefetchCount: 10,
            queue: 'prefetch-queue',
        };

        class TestClass {
            @RabbitRPC(options)
            prefetchHandler() {
                return null;
            }
        }

        const metadata = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.prefetchHandler);

        expect(metadata.prefetchCount).toBe(10);
        expect(metadata.noAck).toBe(true);
    });

    it('should allow multiple RPC handlers in same class', () => {
        class TestClass {
            @RabbitRPC({ queue: 'queue1' })
            handler1() {
                return 1;
            }

            @RabbitRPC({ queue: 'queue2' })
            handler2() {
                return 2;
            }
        }

        const metadata1 = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.handler1);
        const metadata2 = Reflect.getMetadata(RABBIT_RPC_METADATA, TestClass.prototype.handler2);

        expect(metadata1.queue).toBe('queue1');
        expect(metadata2.queue).toBe('queue2');
    });
});
