// src/clients/rabbit-clients.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../config/envs';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'COMPANY_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: envs.rabbitmqServers,
          queue: 'company_queue',
          queueOptions: {
            durable: true,
            arguments: {
              'x-message-ttl': 300000,
              'x-expires': 600000
            }
          },
          socketOptions: {
            keepAlive: true,
            heartbeatIntervalInSeconds: 30,
            timeout: envs.uploadTimeout,
            noDelay: true,
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitClientsModule {}