import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
  ],
  imports: [StorageModule]
})
export class FilesModule {}
