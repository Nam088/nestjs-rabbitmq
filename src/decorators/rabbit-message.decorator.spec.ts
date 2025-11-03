import { RabbitMessage, RabbitContext } from './rabbit-message.decorator';
import 'reflect-metadata';

describe('RabbitMessage Decorator', () => {
    it('should be defined', () => {
        expect(RabbitMessage).toBeDefined();
        expect(typeof RabbitMessage).toBe('function');
    });
});

describe('RabbitContext Decorator', () => {
    it('should be defined and alias RabbitMessage', () => {
        expect(RabbitContext).toBeDefined();
        expect(RabbitContext).toBe(RabbitMessage);
    });
});
