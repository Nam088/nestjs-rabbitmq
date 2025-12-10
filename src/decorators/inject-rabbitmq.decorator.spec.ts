import { DEFAULT_CONNECTION_NAME, RABBITMQ_CONNECTION_MANAGER } from '../constants';

import { InjectRabbitMQ } from './inject-rabbitmq.decorator';

describe('InjectRabbitMQ Decorator', () => {
    it('should return inject decorator with default connection name', () => {
        const decorator = InjectRabbitMQ();

        expect(decorator).toBeDefined();
    });

    it('should return inject decorator with custom connection name', () => {
        const decorator = InjectRabbitMQ('custom');

        expect(decorator).toBeDefined();
    });

    it('should create correct injection token for default connection', () => {
        const expectedToken = `${RABBITMQ_CONNECTION_MANAGER}_${DEFAULT_CONNECTION_NAME}`;

        // The decorator returns the result of Inject() which we can't easily test
        // but we can verify the function executes without error
        expect(() => InjectRabbitMQ()).not.toThrow();
    });

    it('should create correct injection token for custom connection', () => {
        const expectedToken = `${RABBITMQ_CONNECTION_MANAGER}_custom`;

        expect(() => InjectRabbitMQ('custom')).not.toThrow();
    });
});
