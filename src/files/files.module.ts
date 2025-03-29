import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageModule } from 'src/storage/storage.module';
import { StorageQuotaGuard } from 'src/guard/storage-quota.guard';
import { RabbitClientsModule } from 'src/clients/rabbit-clients.module';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    StorageQuotaGuard,
  ],
  imports: [
    StorageModule,
    RabbitClientsModule,
  ]
})
export class FilesModule {}
