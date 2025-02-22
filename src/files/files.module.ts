import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageModule } from 'src/storage/storage.module';
import { FileProcessorService } from './file-processor.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService,FileProcessorService],
  imports: [StorageModule]
})
export class FilesModule {}
