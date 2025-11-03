import { Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRabbitMQ, RabbitMQService } from '@nam088/nestjs-rabbitmq';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRabbitMQ() private readonly rabbit: RabbitMQService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('send')
  async sendMessage(
    @Query('message') message = 'hello world',
  ): Promise<{ ok: true }> {
    const exchange = process.env.RABBITMQ_EXCHANGE ?? 'app.exchange';
    const routingKey = process.env.RABBITMQ_ROUTING_KEY ?? 'app.key';
    await this.rabbit.publish(exchange, routingKey, {
      message,
      at: Date.now(),
    });
    return { ok: true };
  }
}
