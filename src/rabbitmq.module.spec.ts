import { RabbitMQModule } from './rabbitmq.module';

describe('RabbitMQModule', () => {
    it('should be defined', () => {
        expect(RabbitMQModule).toBeDefined();
    });

    describe('forRoot', () => {
        it('should return a dynamic module', () => {
            const module = RabbitMQModule.forRoot({
                connectionName: 'test',
                uri: 'amqp://localhost:5672',
            });

            expect(module).toBeDefined();
            expect(module.module).toBe(RabbitMQModule);
            expect(module.imports).toBeDefined();
            expect(module.exports).toBeDefined();
        });

        it('should accept minimal configuration', () => {
            const module = RabbitMQModule.forRoot({
                uri: 'amqp://localhost:5672',
            });

            expect(module).toBeDefined();
        });

        it('should accept full configuration', () => {
            const module = RabbitMQModule.forRoot({
                connectionName: 'custom',
                connectionOptions: {
                    heartbeatIntervalInSeconds: 10,
                    reconnectTimeInSeconds: 5,
                },
                exchanges: [{ name: 'test', type: 'topic', options: { durable: true } }],
                queues: [{ name: 'test-queue', options: { durable: true } }],
                uri: 'amqp://localhost:5672',
            });

            expect(module).toBeDefined();
        });
    });

    describe('forRootAsync', () => {
        it('should return a dynamic module with useFactory', () => {
            const module = RabbitMQModule.forRootAsync({
                useFactory: () => ({
                    uri: 'amqp://localhost:5672',
                }),
            });

            expect(module).toBeDefined();
            expect(module.module).toBe(RabbitMQModule);
        });

        it('should return a dynamic module with useClass', () => {
            class ConfigService {
                createRabbitMQOptions() {
                    return {
                        uri: 'amqp://localhost:5672',
                    };
                }
            }

            const module = RabbitMQModule.forRootAsync({
                useClass: ConfigService,
            });

            expect(module).toBeDefined();
        });
    });
});
