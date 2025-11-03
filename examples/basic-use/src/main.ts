import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RabbitMQ Example')
    .setDescription('Swagger docs for pub/sub and RPC')
    .setVersion('1.0')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server listening on http://localhost:${port}`);
  Logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

void bootstrap();
