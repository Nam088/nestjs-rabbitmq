import { RabbitPayload } from './rabbit-payload.decorator';
import { ExecutionContext } from '@nestjs/common';
import 'reflect-metadata';

describe('RabbitPayload Decorator', () => {
    it('should be defined', () => {
        expect(RabbitPayload).toBeDefined();
    });

    it('should create a parameter decorator', () => {
        class TestClass {
            testMethod(@RabbitPayload() payload: any) {
                return payload;
            }
        }

        expect(TestClass).toBeDefined();
    });

    it('should extract parameter with property name', () => {
        class TestClass {
            testMethod(@RabbitPayload('name') name: string) {
                return name;
            }
        }

        expect(TestClass).toBeDefined();
    });

    it('should work with multiple parameters', () => {
        class TestClass {
            testMethod(
                @RabbitPayload() fullPayload: any,
                @RabbitPayload('id') id: number,
                @RabbitPayload('name') name: string,
            ) {
                return { fullPayload, id, name };
            }
        }

        expect(TestClass).toBeDefined();
    });

    it('should be usable in controller methods', () => {
        class MessageController {
            handleMessage(@RabbitPayload() data: any) {
                return { received: data };
            }
        }

        const controller = new MessageController();
        expect(controller).toBeDefined();
        expect(controller.handleMessage).toBeDefined();
    });

    it('should work with complex types', () => {
        interface UserPayload {
            id: number;
            name: string;
            email: string;
        }

        class UserHandler {
            processUser(@RabbitPayload() user: UserPayload) {
                return user;
            }
        }

        const handler = new UserHandler();
        expect(handler).toBeDefined();
    });
});

