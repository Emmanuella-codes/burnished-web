import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from 'src/documents/documents.module';
import { ProcessingService } from './processing.service';

@Module({
  imports: [ConfigModule, DocumentsModule],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
