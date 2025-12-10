import { Injectable } from '@nestjs/common';

import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

import { DEFAULT_CONNECTION_NAME } from '../constants';
import { InjectRabbitMQ } from '../decorators/inject-rabbitmq.decorator';
import { RabbitMQService } from '../services/rabbitmq.service';

/**
 * Health indicator for RabbitMQ connections.
 * Integrates with @nestjs/terminus to provide health checks for RabbitMQ.
 *
 * @example
 * ```typescript
 * @Controller('health')
 * class HealthController {
 *   constructor(
 *     private health: HealthCheckService,
 *     private rabbitmqHealth: RabbitMQHealthIndicator,
 *   ) {}
 *
 *   @Get()
 *   @HealthCheck()
 *   check() {
 *     return this.health.check([
 *       () => this.rabbitmqHealth.isHealthy(),
 *       () => this.rabbitmqHealth.isHealthy('secondary', 3000),
 *     ]);
 *   }
 * }
 * ```
 */
@Injectable()
export class RabbitMQHealthIndicator {
    /**
     * Creates an instance of RabbitMQHealthIndicator.
     *
     * @param {HealthIndicatorService} healthIndicatorService - The terminus health indicator service
     * @param {RabbitMQService} rabbitmqService - The RabbitMQ service instance
     */
    constructor(
        private readonly healthIndicatorService: HealthIndicatorService,
        @InjectRabbitMQ() private readonly rabbitmqService: RabbitMQService,
    ) {}

    /**
     * Checks the RabbitMQ connection status with a timeout.
     *
     * @private
     * @param {number} timeout - Maximum time to wait for connection check in milliseconds
     * @returns {Promise<boolean>} True if connected, false if not connected or timeout
     */
    private async checkConnection(timeout: number): Promise<boolean> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(false);
            }, timeout);

            try {
                const isConnected = this.rabbitmqService.isConnected();

                clearTimeout(timer);
                resolve(isConnected);
            } catch {
                clearTimeout(timer);
                resolve(false);
            }
        });
    }

    /**
     * Performs a health check on the RabbitMQ connection.
     *
     * @param {string} [connectionName='default'] - The name of the connection to check
     * @param {number} [timeout=5000] - Timeout in milliseconds for the health check
     * @returns {Promise<HealthIndicatorResult>} The health indicator result
     *
     * @example
     * ```typescript
     * // Basic usage
     * const result = await rabbitmqHealth.isHealthy();
     * // Returns: { rabbitmq_default: { status: 'up', connection: 'default' } }
     *
     * // With custom connection and timeout
     * const result = await rabbitmqHealth.isHealthy('secondary', 3000);
     * // Returns: { rabbitmq_secondary: { status: 'up', connection: 'secondary' } }
     *
     * // When unhealthy
     * // Returns: { rabbitmq_default: { status: 'down', connection: 'default', error: '...' } }
     * ```
     */
    async isHealthy(
        connectionName: string = DEFAULT_CONNECTION_NAME,
        timeout: number = 5000,
    ): Promise<HealthIndicatorResult> {
        const key = `rabbitmq_${connectionName}`;
        const indicator = this.healthIndicatorService.check(key);

        try {
            const isConnected = await this.checkConnection(timeout);

            if (isConnected) {
                return indicator.up({
                    status: 'up',
                    connection: connectionName,
                });
            }

            return indicator.down({
                status: 'down',
                connection: connectionName,
                error: 'RabbitMQ connection is not established',
            });
        } catch (error) {
            return indicator.down({
                status: 'down',
                connection: connectionName,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
