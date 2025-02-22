import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { CONSOLE_COLORS } from './common/constants/colors.constants';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';

async function bootstrap() {
  const logger = new Logger(`${CONSOLE_COLORS.TEXT.MAGENTA}Files Microservice`);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: envs.rabbitmqServers,
        queue: 'files_queue',
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 3,
        socketOptions: {
          keepAlive: true,
          heartbeatIntervalInSeconds: 30
        }
      }
    }
  );

  app.listen().then(() => {
    logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Files Microservice is running on ${envs.port} port`);
  });
}
bootstrap();
