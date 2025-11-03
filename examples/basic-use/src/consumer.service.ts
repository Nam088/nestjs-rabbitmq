import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class ConsumerService {
  private readonly logger = new Logger(ConsumerService.name);

  @RabbitSubscribe({
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'app.exchange',
    routingKey: process.env.RABBITMQ_ROUTING_KEY ?? 'app.key',
    queue: process.env.RABBITMQ_QUEUE ?? 'app.queue',
  })
  handleMessage(message: unknown) {
    this.logger.log(`Received message: ${JSON.stringify(message)}`);
  }
}
