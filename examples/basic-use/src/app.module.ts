import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@nam088/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsumerService } from './consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'RABBITMQ_URI',
          'amqp://guest:guest@localhost:5672',
        ),
        connectionName: config.get<string>(
          'RABBITMQ_CONNECTION_NAME',
          'basic-use',
        ),
        // Optimize discovery to only scan annotated classes
        scanScope: 'annotated',
        // Declare example exchanges for testing different types
        exchanges: [
          { name: 'app.direct', type: 'direct', options: { durable: false } },
          { name: 'app.topic', type: 'topic', options: { durable: false } },
          { name: 'app.fanout', type: 'fanout', options: { durable: false } },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, ConsumerService],
})
export class AppModule {}
