import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { WebhookAuthGuard } from 'src/common/guards/webhook-auth.guard';
import { ProcessingResultDto } from './dto/processing-result.dto';

@Controller('webhooks/processing')
export class ProcessingWebhookController {
  private readonly logger = new Logger(ProcessingWebhookController.name);

  constructor(private readonly processingService: ProcessingService) {}

  @Post('result')
  @HttpCode(200)
  @UseGuards(WebhookAuthGuard)
  async handleProcessingResult(@Body() result: ProcessingResultDto) {
    this.logger.log(
      `Received webhook for document ${result.documentID} with status ${result.status}`,
    );
    await this.processingService.handleProcessingResult(result);

    return { success: true };
  }
}
