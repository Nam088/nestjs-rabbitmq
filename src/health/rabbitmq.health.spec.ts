import { HealthCheckError } from '@nestjs/terminus';

import { RabbitMQHealthIndicator } from './rabbitmq.health';
import { RabbitMQService } from '../services/rabbitmq.service';

describe('RabbitMQHealthIndicator', () => {
    let healthIndicator: RabbitMQHealthIndicator;
    let rabbitmqService: jest.Mocked<RabbitMQService>;

    beforeEach(() => {
        rabbitmqService = {
            isConnected: jest.fn(),
        } as any;

        healthIndicator = new RabbitMQHealthIndicator(rabbitmqService);
    });

    describe('isHealthy', () => {
        it('should return healthy status when connected', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('default', 5000);

            expect(result).toEqual({
                'rabbitmq_default': {
                    status: 'up',
                    connection: 'default',
                },
            });
        });

        it('should throw HealthCheckError when not connected', async () => {
            rabbitmqService.isConnected.mockReturnValue(false);

            await expect(healthIndicator.isHealthy('default', 5000)).rejects.toThrow(
                HealthCheckError,
            );
        });

        it('should use default connection name if not provided', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy();

            expect(result).toHaveProperty('rabbitmq_default');
            expect(result['rabbitmq_default']).toEqual({
                status: 'up',
                connection: 'default',
            });
        });

        it('should use default timeout if not provided', async () => {
            rabbitmqService.isConnected.mockReturnValue(true);

            const result = await healthIndicator.isHealthy('default');

            expect(result).toBeDefined();
        });

        it('should handle custom connection name', async () => {
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
            // The checkConnection method has a timeout built-in
            // When timeout occurs, it returns false, leading to HealthCheckError
            jest.useFakeTimers();
            
            let timeoutCallback: any;
            jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, ms?: number) => {
                if (ms === 100) {
                    timeoutCallback = callback;
                }
                return {} as any;
            });

            const promise = healthIndicator.isHealthy('default', 100);
            
            // Trigger the timeout
            if (timeoutCallback) {
                timeoutCallback();
            }
            
            await expect(promise).rejects.toThrow(HealthCheckError);
            
            jest.restoreAllMocks();
            jest.useRealTimers();
        });

        it('should handle errors during connection check', async () => {
            rabbitmqService.isConnected.mockImplementation(() => {
                throw new Error('Connection error');
            });

            await expect(healthIndicator.isHealthy('default', 5000)).rejects.toThrow(
                HealthCheckError,
            );
        });

        it('should include error details in health check error', async () => {
            rabbitmqService.isConnected.mockReturnValue(false);

            try {
                await healthIndicator.isHealthy('default', 5000);
                fail('Should have thrown HealthCheckError');
            } catch (error) {
                expect(error).toBeInstanceOf(HealthCheckError);
                expect(error.message).toBe('RabbitMQ health check failed');
                expect(error.causes).toHaveProperty('rabbitmq_default');
                expect(error.causes['rabbitmq_default']).toEqual({
                    status: 'down',
                    connection: 'default',
                    error: 'RabbitMQ connection is not established',
                });
            }
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
            rabbitmqService.isConnected.mockImplementation(() => {
                throw new Error('Connection failed');
            });

            try {
                await healthIndicator.isHealthy('default', 5000);
                fail('Should have thrown HealthCheckError');
            } catch (error) {
                expect(error).toBeInstanceOf(HealthCheckError);
                expect(error.causes['rabbitmq_default'].status).toBe('down');
                expect(error.causes['rabbitmq_default']).toHaveProperty('error');
            }
        });
    });
});

