import { RabbitMQHealthIndicator } from './rabbitmq.health';

import type { RabbitMQService } from '../services/rabbitmq.service';
import type { HealthIndicatorService } from '@nestjs/terminus';

describe('RabbitMQHealthIndicator', () => {
    let healthIndicator: RabbitMQHealthIndicator;
    let rabbitmqService: jest.Mocked<RabbitMQService>;
    let healthIndicatorService: jest.Mocked<HealthIndicatorService>;

    beforeEach(() => {
        rabbitmqService = {
            isConnected: jest.fn(),
        } as any;

        healthIndicatorService = {
            check: jest.fn().mockReturnValue({
                down: jest.fn((data: any) => ({ rabbitmq_default: { status: 'down', ...data } })),
                up: jest.fn((data: any) => ({ rabbitmq_default: { status: 'up', ...data } })),
            }),
        } as any;

        healthIndicator = new RabbitMQHealthIndicator(healthIndicatorService, rabbitmqService);
    });

    describe('isHealthy', () => {
        it('should return healthy status when connected', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result).toEqual({
                rabbitmq_default: {
                    status: 'up',
                    connection: 'default',
                },
            });
        });

        it('should return down status when not connected', async () => {
            rabbitmqService.isConnected.mockReturnValue(false);

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result).toEqual({
                rabbitmq_default: {
                    status: 'down',
                    connection: 'default',
                    error: 'RabbitMQ connection is not established',
                },
            });
        });

        it('should use default connection name if not provided', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy();

            expect(result).toHaveProperty('rabbitmq_default');
        });

        it('should use default timeout if not provided', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('default');

            expect(result).toBeDefined();
        });

        it('should handle custom connection name', async () => {
            healthIndicatorService.check.mockReturnValue({
                down: jest.fn((data: any) => ({ 'rabbitmq_custom-connection': { status: 'down', ...data } })),
                key: 'rabbitmq_custom-connection',
                up: jest.fn((data: any) => ({ 'rabbitmq_custom-connection': { status: 'up', ...data } })),
            } as any);

            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('custom-connection', 5000);

            expect(result).toEqual({
                'rabbitmq_custom-connection': {
                    status: 'up',
                    connection: 'custom-connection',
                },
            });
        });

        it('should handle connection check timeout gracefully', async () => {
            // The checkConnection method wraps isConnected with a timeout
            // When isConnected throws or returns false within timeout, it returns false
            rabbitmqService.isConnected.mockReturnValue(false);

            const result = await healthIndicator.isHealthy('default', 100);

            expect(result.rabbitmq_default.status).toBe('down');
        });

        it('should handle errors during connection check', async () => {
            rabbitmqService.isConnected.mockImplementation(() => {
                throw new Error('Connection error');
            });

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result.rabbitmq_default.status).toBe('down');
        });

        it('should include error details in health check result', async () => {
            rabbitmqService.isConnected.mockReturnValue(false);

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result.rabbitmq_default).toEqual({
                status: 'down',
                connection: 'default',
                error: 'RabbitMQ connection is not established',
            });
        });

        it('should clear timeout on successful check', async () => {
            jest.useFakeTimers();
            rabbitmqService.isConnected.mockReturnValue(true);

            const promise = healthIndicator.isHealthy('default', 5000);

            // Fast-forward time
            jest.runAllTimers();

            const result = await promise;

            expect(result).toBeDefined();

            jest.useRealTimers();
        });

        it('should handle very short timeouts', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('default', 1);

            expect(result).toBeDefined();
        });

        it('should handle exception with error message', async () => {
            healthIndicatorService.check.mockReturnValue({
                down: jest.fn((data: any) => ({ rabbitmq_default: { status: 'down', ...data } })),
                key: 'rabbitmq_default',
                up: jest.fn((data: any) => ({ rabbitmq_default: { status: 'up', ...data } })),
            } as any);

            rabbitmqService.isConnected.mockImplementation(() => {
                throw new Error('Connection failed');
            });

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result.rabbitmq_default.status).toBe('down');
            expect(result.rabbitmq_default).toHaveProperty('error');
        });
    });
});
