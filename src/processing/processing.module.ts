import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';
import { ProcessingService } from './processing.service';
import { HttpModule } from '@nestjs/axios';
import { ProcessingWebhookController } from './processing-webhook.controller';

@Module({
  imports: [ConfigModule, HttpModule, forwardRef(() => DocumentsModule)],
  controllers: [ProcessingWebhookController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
