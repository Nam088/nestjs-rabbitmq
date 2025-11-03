# @nam088/nestjs-rabbitmq

A comprehensive and production-ready RabbitMQ module for NestJS with decorator-based message handling, inspired by modern NestJS patterns.

## Features

**Decorator-Based API** - Use `@RabbitSubscribe` to handle messages declaratively  
**Multi-Connection Support** - Manage multiple RabbitMQ connections  
**Health Checks** - Built-in health indicators for monitoring  
**Auto-Discovery** - Automatic message handler registration  
**TypeScript First** - Full type safety and IntelliSense support  
**Exchange Patterns** - Support for direct, topic, fanout exchanges  
**Message Patterns** - Pub/Sub, Request/Reply, Work Queues  
**Error Handling** - Built-in retry logic and dead letter queues  
**Well Tested** - Comprehensive test coverage

## Installation

```bash
npm install @nam088/nestjs-rabbitmq amqplib amqp-connection-manager
# or
yarn add @nam088/nestjs-rabbitmq amqplib amqp-connection-manager
# or
pnpm add @nam088/nestjs-rabbitmq amqplib amqp-connection-manager
```

> Note: `amqplib` and `amqp-connection-manager` are peer dependencies. Install them in your application.

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@nam088/nestjs-rabbitmq';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: 'amqp://localhost:5672',
      connectionName: 'default',
    }),
  ],
})
export class AppModule {}
```

### 2. Create a Message Handler

```typescript
import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class UserService {
  @RabbitSubscribe({
    exchange: 'users',
    routingKey: 'user.created',
    queue: 'user-service-queue',
  })
  async handleUserCreated(message: any) {
    console.log('User created:', message);
  }
}
```

### 3. Publish Messages

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRabbitMQ, RabbitMQService } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRabbitMQ() private readonly rabbitmq: RabbitMQService,
  ) {}

  async notifyUserCreated(userId: string) {
    await this.rabbitmq.publish('users', 'user.created', {
      userId,
      timestamp: new Date(),
    });
  }
}
```

## Configuration

### Basic Configuration

```typescript
RabbitMQModule.forRoot({
  uri: 'amqp://localhost:5672',
  connectionName: 'default',
})
```

### Advanced Configuration

```typescript
RabbitMQModule.forRoot({
  uri: 'amqp://localhost:5672',
  connectionName: 'default',
  exchanges: [
    {
      name: 'users',
      type: 'topic',
      options: { durable: true },
    },
    {
      name: 'orders',
      type: 'direct',
      options: { durable: true },
    },
  ],
  connectionOptions: {
    heartbeatIntervalInSeconds: 5,
    reconnectTimeInSeconds: 10,
  },
})
```

### Async Configuration

```typescript
RabbitMQModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    uri: config.get('RABBITMQ_URI'),
    connectionName: 'default',
  }),
  inject: [ConfigService],
})
```

### Multiple Connections

```typescript
@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: 'amqp://localhost:5672',
      connectionName: 'primary',
    }),
    RabbitMQModule.forRoot({
      uri: 'amqp://other-host:5672',
      connectionName: 'secondary',
    }),
  ],
})
export class AppModule {}

// Inject specific connection
@Injectable()
export class MyService {
  constructor(
    @InjectRabbitMQ('primary') private readonly primary: RabbitMQService,
    @InjectRabbitMQ('secondary') private readonly secondary: RabbitMQService,
  ) {}
}
```

## Message Patterns

### Pub/Sub Pattern

```typescript
// Publisher
await rabbitmq.publish('events', 'user.updated', { userId: 123 });

// Subscriber
@RabbitSubscribe({
  exchange: 'events',
  routingKey: 'user.*',
  queue: 'analytics-service',
})
async handleUserEvents(message: any) {
  // Handle all user events
}
```

### Work Queue Pattern

```typescript
// Multiple workers sharing the same queue
@RabbitSubscribe({
  queue: 'heavy-tasks',
  queueOptions: { durable: true },
})
async processTask(task: any) {
  // Only one worker will process each task
}
```

### RPC Pattern

```typescript
// Request
const result = await rabbitmq.request('rpc-queue', { operation: 'calculate' });

// Reply
@RabbitSubscribe({
  queue: 'rpc-queue',
  rpc: true,
})
async handleRPC(data: any) {
  const result = performCalculation(data);
  return result; // Automatically sends reply
}
```

## Advanced Decorators

### RPC Handler with @RabbitRPC

```typescript
import { Injectable } from '@nestjs/common';
import { RabbitRPC, RabbitPayload } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class CalculatorService {
  @RabbitRPC({
    queue: 'calculator-rpc',
    noAck: false,
    prefetchCount: 1,
  })
  async calculate(@RabbitPayload() data: { a: number; b: number; op: string }) {
    switch (data.op) {
      case 'add':
        return data.a + data.b;
      case 'multiply':
        return data.a * data.b;
      default:
        throw new Error('Unknown operation');
    }
  }
}
```

### Message Handler with @RabbitHandler

```typescript
import { Injectable } from '@nestjs/common';
import { RabbitHandler, RabbitPayload, RabbitMessage } from '@nam088/nestjs-rabbitmq';

@Injectable()
export class OrderService {
  @RabbitHandler({
    exchange: 'orders',
    routingKey: 'order.created',
    queue: 'order-processing',
  })
  async handleOrderCreated(
    @RabbitPayload() order: { id: string; amount: number },
    @RabbitMessage('properties') properties: any,
  ) {
    console.log('Order ID:', order.id);
    console.log('Message ID:', properties.messageId);
    
    // Process order
    await this.processOrder(order);
  }
}
```

### Parameter Decorators

```typescript
import { Injectable } from '@nestjs/common';
import { 
  RabbitSubscribe, 
  RabbitPayload, 
  RabbitMessage,
  RabbitContext 
} from '@nam088/nestjs-rabbitmq';

@Injectable()
export class MessageProcessor {
  // Extract entire payload
  @RabbitSubscribe({ queue: 'user-events' })
  async handleUser(@RabbitPayload() user: { id: string; name: string }) {
    console.log('User:', user);
  }

  // Extract specific field from payload
  @RabbitSubscribe({ queue: 'notifications' })
  async handleNotification(
    @RabbitPayload('userId') userId: string,
    @RabbitPayload('message') message: string,
  ) {
    console.log(`Send ${message} to user ${userId}`);
  }

  // Access full message context
  @RabbitSubscribe({ queue: 'logs' })
  async handleLog(
    @RabbitPayload() data: any,
    @RabbitContext() fullMessage: any,
  ) {
    console.log('Routing Key:', fullMessage.fields.routingKey);
    console.log('Exchange:', fullMessage.fields.exchange);
    console.log('Data:', data);
  }

  // Get message properties
  @RabbitSubscribe({ queue: 'tasks' })
  async handleTask(
    @RabbitPayload() task: any,
    @RabbitMessage('properties') props: any,
  ) {
    console.log('Correlation ID:', props.correlationId);
    console.log('Timestamp:', props.timestamp);
  }
}
```

### Multi-Connection with Decorators

```typescript
@Injectable()
export class MultiConnService {
  @RabbitRPC({
    queue: 'primary-rpc',
    connectionName: 'primary',
  })
  async handlePrimary(@RabbitPayload() data: any) {
    return { status: 'processed', data };
  }

  @RabbitHandler({
    queue: 'secondary-queue',
    connectionName: 'secondary',
    prefetchCount: 5,
  })
  async handleSecondary(@RabbitPayload() message: any) {
    console.log('From secondary connection:', message);
  }
}
```

## Health Checks

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from '@nam088/nestjs-rabbitmq';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class HealthModule {}

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private rabbitmq: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.rabbitmq.isHealthy('default'),
    ]);
  }
}
```

## API Reference

### RabbitMQModule

- `forRoot(options)` - Register with static configuration
- `forRootAsync(options)` - Register with async configuration

### RabbitMQService

- `publish(exchange, routingKey, message, options?)` - Publish a message
- `sendToQueue(queue, message, options?)` - Send to queue directly
- `request(queue, message, options?)` - RPC request-reply
- `createChannel()` - Get the underlying channel
- `getConnection()` - Get the connection manager

### Decorators

- `@RabbitSubscribe(options)` - Subscribe to messages
- `@InjectRabbitMQ(connectionName?)` - Inject RabbitMQ service
- `@RabbitRPC(options)` - Mark method as RPC handler (request-reply pattern)
- `@RabbitHandler(options)` - Generic message handler decorator
- `@RabbitPayload(property?)` - Extract payload from message
- `@RabbitMessage(property?)` / `@RabbitContext(property?)` - Get full message context

## Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic Usage](./examples/basic-usage) - Simple pub/sub example
- [Multiple Connections](./examples/multi-connection) - Working with multiple connections
- [RPC Pattern](./examples/rpc-pattern) - Request-reply pattern
- [Error Handling](./examples/error-handling) - Retry and dead letter queues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © Nam088

