import { RabbitRPC, RabbitPayload, RabbitController } from '@nam088/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
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
