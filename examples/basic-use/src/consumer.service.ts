import { Injectable, Logger } from '@nestjs/common';
import { RabbitController } from '@nam088/nestjs-rabbitmq';
import {
  RabbitRPC,
  RabbitSubscribe,
  RabbitPayload,
} from '@nam088/nestjs-rabbitmq';

@Injectable()
@RabbitController()
export class ConsumerService {
  private readonly logger = new Logger(ConsumerService.name);

  @RabbitSubscribe({
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'app.exchange',
    routingKey: process.env.RABBITMQ_ROUTING_KEY ?? 'app.key',
    queue: process.env.RABBITMQ_QUEUE ?? 'app.queue',
    // consumeOptions có thể bổ sung nếu cần
  })
  handleMessage(message: unknown): void {
    this.logger.log(`Received message: ${JSON.stringify(message)}`);
  }

  // Direct exchange example
  @RabbitSubscribe({
    exchange: 'app.direct',
    routingKey: 'app.direct.key',
    queue: 'app.direct.q',
  })
  handleDirect(message: unknown): void {
    this.logger.log(`[direct] ${JSON.stringify(message)}`);
  }

  // Topic exchange example
  @RabbitSubscribe({
    exchange: 'app.topic',
    routingKey: 'user.*',
    queue: 'app.topic.q',
  })
  handleTopic(message: unknown): void {
    this.logger.log(`[topic] ${JSON.stringify(message)}`);
  }

  // Fanout exchange example (routingKey ignored)
  @RabbitSubscribe({
    exchange: 'app.fanout',
    queue: 'app.fanout.q',
  })
  handleFanout(message: unknown): void {
    this.logger.log(`[fanout] ${JSON.stringify(message)}`);
  }

  @RabbitRPC({
    queue: process.env.RABBITMQ_RPC_QUEUE ?? 'app.rpc',
    prefetchCount: 1,
  })
  handleRpc(@RabbitPayload() payload: unknown): Record<string, unknown> {
    this.logger.log(`RPC request: ${JSON.stringify(payload)}`);
    return {
      ok: true,
      echo: payload,
      handledBy: 'ConsumerService.handleRpc',
      at: Date.now(),
    };
  }

  @RabbitRPC({
    queue: 'math.add',
    prefetchCount: 1,
  })
  addNumbers(
    @RabbitPayload()
    payload: { a: number; b: number },
  ): { ok: true; sum: number } {
    const a = Number(payload?.a ?? 0);
    const b = Number(payload?.b ?? 0);
    const sum = a + b;
    return { ok: true, sum };
  }
}
