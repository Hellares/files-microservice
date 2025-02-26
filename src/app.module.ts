import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    StorageModule,
    FilesModule],
  controllers: [],
  providers: [
    
  ],
})
export class AppModule {}
