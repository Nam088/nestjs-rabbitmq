import { RabbitRPC, RABBIT_RPC_METADATA, RabbitRPCOptions } from './rabbit-rpc.decorator';
import 'reflect-metadata';

describe('RabbitRPC Decorator', () => {
    it('should set metadata on method', () => {
        const options: RabbitRPCOptions = {
            queue: 'test-rpc-queue',
            noAck: false,
            prefetchCount: 1,
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
            queue: 'multi-conn-queue',
            connectionName: 'secondary',
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
            queue: 'prefetch-queue',
            prefetchCount: 10,
            noAck: true,
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

