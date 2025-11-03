import { Inject } from '@nestjs/common';

import { DEFAULT_CONNECTION_NAME, RABBITMQ_CONNECTION_MANAGER } from '../constants';

/**
 * Inject RabbitMQ service
 * @param connectionName - Connection name (optional)
 */
export const InjectRabbitMQ = (connectionName: string = DEFAULT_CONNECTION_NAME): ParameterDecorator =>
    Inject(`${RABBITMQ_CONNECTION_MANAGER}_${connectionName}`);
