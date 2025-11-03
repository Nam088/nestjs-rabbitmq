import { DynamicModule, Module } from '@nestjs/common';

import { RabbitMQModuleAsyncOptions, RabbitMQModuleOptions } from './interfaces/rabbitmq-options.interface';

import { RabbitMQCoreModule } from './rabbitmq-core.module';

/**
 * RabbitMQ Module
 * Provides RabbitMQ integration for NestJS applications
 */
@Module({})
export class RabbitMQModule {
    /**
     * Register RabbitMQ module with static configuration
     * @param options - RabbitMQ module options
     */
    static forRoot(options: RabbitMQModuleOptions): DynamicModule {
        return {
            imports: [RabbitMQCoreModule.forRoot(options)],
            exports: [RabbitMQCoreModule],
            module: RabbitMQModule,
        };
    }

    /**
     * Register RabbitMQ module with async configuration
     * @param options - Async RabbitMQ module options
     */
    static forRootAsync(options: RabbitMQModuleAsyncOptions): DynamicModule {
        return {
            imports: [RabbitMQCoreModule.forRootAsync(options)],
            exports: [RabbitMQCoreModule],
            module: RabbitMQModule,
        };
    }
}
