import { Injectable } from '@nestjs/common';

import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { DEFAULT_CONNECTION_NAME } from '../constants';
import { InjectRabbitMQ } from '../decorators/inject-rabbitmq.decorator';
import { RabbitMQService } from '../services/rabbitmq.service';

/**
 * RabbitMQ health indicator for @nestjs/terminus
 */
@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
    constructor(@InjectRabbitMQ() private readonly rabbitmqService: RabbitMQService) {
        super();
    }

    /**
     * Check connection with timeout
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
     * Check if RabbitMQ connection is healthy
     * @param connectionName - Connection name to check
     * @param timeout - Timeout in milliseconds
     */
    async isHealthy(
        connectionName: string = DEFAULT_CONNECTION_NAME,
        timeout: number = 5000,
    ): Promise<HealthIndicatorResult> {
        const key = `rabbitmq_${connectionName}`;

        try {
            const isConnected = await this.checkConnection(timeout);

            if (isConnected) {
                return this.getStatus(key, true, {
                    status: 'up',
                    connection: connectionName,
                });
            }

            throw new Error('RabbitMQ connection is not established');
        } catch (error) {
            throw new HealthCheckError(
                'RabbitMQ health check failed',
                this.getStatus(key, false, {
                    status: 'down',
                    connection: connectionName,
                    error: error.message,
                }),
            );
        }
    }
}
