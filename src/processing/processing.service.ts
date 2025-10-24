import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../documents/documents.service';
import { ProcessingStatus } from './enums/processing-status.enum';
import * as FormData from 'form-data';
import { ProcessingMode } from './enums/processing-mode.enum';
import { catchError, firstValueFrom } from 'rxjs';
import { ProcessingResultDto } from './dto/processing-result.dto';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly documentsService: DocumentsService,
  ) {}

  async processDocument(
    file: Express.Multer.File,
    mode: string,
    jobDescription?: string,
  ): Promise<any> {
    try {
      const form = new FormData();
      form.append('file', file.buffer, { filename: file.originalname });
      form.append('mode', mode);

      if ((mode === ProcessingMode.FORMAT || mode === ProcessingMode.LETTER) && jobDescription) {
        form.append('jobDescription', jobDescription);
        this.logger.log(`Sending jobDescription: ${jobDescription.substring(0, 100)}...`);
      } else if (mode === ProcessingMode.LETTER && !jobDescription) {
        this.logger.error('Letter mode requires jobDescription but none provided');
      }

      const microServiceUrl = this.configService.get<string>('MICROSERVICE_URL');
      const apiKey = this.configService.get<string>('MICROSERVICE_API_KEY');

      if (!microServiceUrl) {
        throw new InternalServerErrorException('Microservice URL not configured');
      }
      if (!apiKey) {
        throw new InternalServerErrorException('Microservice API key not configured');
      }

      const headers = {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      };

      const { data } = await firstValueFrom(
        this.httpService
          .post(`${microServiceUrl}/process`, form, { headers })
          .pipe(
            catchError((error) => {
              const msg = error.response?.data?.message || error.message;
              this.logger.error(`Error calling microservice: ${msg}`);
              throw new InternalServerErrorException(`Microservice error: ${msg}`);
            }),
          ),
      );

      this.logger.log(`File ${file.originalname} processed successfully`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to process file: ${error.message}`);
      throw error;
    }
  }

  async handleProcessingResult(result: ProcessingResultDto): Promise<void> {
    try {
      this.logger.log(
        `Received processing result for document ${result.documentID}`,
      );

      await this.documentsService.updateProcessingResult(result.documentID, {
        formattedResume: result.formattedResume,
        coverLetter: result.coverLetter,
        feedback: typeof result.feedback === 'string' ? result.feedback : JSON.stringify(result.feedback),
        status: result.status
        // error: result.error,
      });

      this.logger.log(
        `Document ${result.documentID} processing completed successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle processing result for document ${result.documentID}: ${error.message}`,
      );
    }
  }
}
