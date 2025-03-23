import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { Logger, PinoLogger } from 'nestjs-pino';

async function bootstrap() {

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: envs.rabbitmqServers,
        queue: 'files_queue',
        queueOptions: {
          durable: true,
          arguments:{
            'x-message-ttl':300000,
            'x-expires': 600000
          }
        },
        noAck: false,
        prefetchCount: 8,
        socketOptions: {
          keepAlive: true,
          heartbeatIntervalInSeconds: 30,
          timeout: envs.uploadTimeout,
          noDelay: true,
        },        
      },
      bufferLogs: true,
      // logger: ['error', 'warn'],
    }
  );

  const logger = app.get(Logger);

  const pinoLogger = await app.resolve(PinoLogger);

  pinoLogger.setContext('Files-Microservice');

  app.useLogger(logger);
  
  

  app.listen().then(() => {
    pinoLogger.info(`Files Microservice running - Connected to RabbitMQ`);
  });
}
bootstrap();
