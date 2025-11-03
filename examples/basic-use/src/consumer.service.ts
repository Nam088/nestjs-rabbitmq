import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRabbitMQ, RabbitMQService } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class ConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ConsumerService.name);

  constructor(@InjectRabbitMQ() private readonly rabbit: RabbitMQService) {}

  async onModuleInit(): Promise<void> {
    const exchange = process.env.RABBITMQ_EXCHANGE ?? 'app.exchange';
    const routingKey = process.env.RABBITMQ_ROUTING_KEY ?? 'app.key';
    const queue = process.env.RABBITMQ_QUEUE ?? 'app.queue';

    // Ensure topology exists
    await this.rabbit.assertExchange(exchange, 'topic', { durable: true });
    await this.rabbit.assertQueue(queue, { durable: true });
    await this.rabbit.bindQueue(queue, exchange, routingKey);

    // Start consumer
    await this.rabbit.consume(queue, (message: unknown) => {
      this.logger.log(`Received message: ${JSON.stringify(message)}`);
    });
  }
}
