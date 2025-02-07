import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [UploadModule, DatabaseModule],
})
export class AppModule {}
