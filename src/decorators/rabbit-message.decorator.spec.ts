import { RabbitMessage, RabbitContext, resolveRabbitMessage } from './rabbit-message.decorator';
import 'reflect-metadata';

describe('RabbitMessage Decorator', () => {
    it('should be defined', () => {
        expect(RabbitMessage).toBeDefined();
        expect(typeof RabbitMessage).toBe('function');
    });

    it('should return full message when no path provided', () => {
        const msg = { foo: 'bar', nested: { a: 1 } };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const result = resolveRabbitMessage(undefined, ctx);
        expect(result).toEqual(msg);
    });

    it('should return nested property when path provided', () => {
        const msg = { foo: 'bar', nested: { a: 1 } };
        const ctx: any = { switchToRpc: () => ({ getData: () => msg }) };

        const result = resolveRabbitMessage('nested', ctx);
        expect(result).toEqual({ a: 1 });
    });
});

describe('RabbitContext Decorator', () => {
    it('should be defined and alias RabbitMessage', () => {
        expect(RabbitContext).toBeDefined();
        expect(RabbitContext).toBe(RabbitMessage);
    });
});
