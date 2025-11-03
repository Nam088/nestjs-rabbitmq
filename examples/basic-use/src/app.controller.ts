import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRabbitMQ, RabbitMQService } from '@nam088/nestjs-rabbitmq';
import { AppService } from './app.service';
import { randomUUID } from 'crypto';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRabbitMQ() private readonly rabbit: RabbitMQService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('send')
  @ApiOperation({ summary: 'Publish message (pub/sub)' })
  @ApiQuery({ name: 'message', required: false })
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

  @Post('send/direct')
  @ApiOperation({ summary: 'Publish to direct exchange app.direct' })
  @ApiQuery({ name: 'rk', required: false })
  async sendDirect(@Query('rk') rk = 'app.direct.key'): Promise<{ ok: true }> {
    await this.rabbit.publish('app.direct', rk, { type: 'direct', at: Date.now() });
    return { ok: true };
  }

  @Post('send/topic')
  @ApiOperation({ summary: 'Publish to topic exchange app.topic' })
  @ApiQuery({ name: 'rk', required: false })
  async sendTopic(@Query('rk') rk = 'user.created'): Promise<{ ok: true }> {
    await this.rabbit.publish('app.topic', rk, { type: 'topic', at: Date.now() });
    return { ok: true };
  }

  @Post('send/fanout')
  @ApiOperation({ summary: 'Publish to fanout exchange app.fanout' })
  async sendFanout(): Promise<{ ok: true }> {
    // fanout ignores routingKey
    await this.rabbit.publish('app.fanout', '', { type: 'fanout', at: Date.now() });
    return { ok: true };
  }

  @Post('rpc')
  @ApiOperation({ summary: 'Send RPC request and get reply' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  async rpc(@Query('message') message = 'ping'): Promise<unknown> {
    const rpcQueue = process.env.RABBITMQ_RPC_QUEUE ?? 'app.rpc';
    const result: unknown = await this.rabbit.request(rpcQueue, {
      correlationId: randomUUID(),
      message,
      at: Date.now(),
    });
    return result;
  }

  @Post('rpc/add')
  @ApiOperation({ summary: 'Add two numbers via RabbitMQ RPC (math.add)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['a', 'b'],
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
    },
  })
  async rpcAdd(
    @Body() body: { a: number; b: number },
  ): Promise<{ ok: true; sum: number }> {
    const result = (await this.rabbit.request('math.add', {
      a: body?.a,
      b: body?.b,
      at: Date.now(),
    })) as { ok: true; sum: number };
    return result;
  }
}
