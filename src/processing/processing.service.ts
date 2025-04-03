import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from 'src/documents/documents.service';
import { ProcessingStatus } from './enums/processing-status.enum';
import * as FormData from 'form-data';
import * as fs from 'fs';
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

  async processDocument(documentID: string): Promise<void> {
    try {
      const document = await this.documentsService.findOne(documentID);
      //update the status to processing
      await this.documentsService.updateStatus(
        documentID,
        ProcessingStatus.PROCESSING,
      );
      //create form data
      const form = new FormData();
      form.append('file', fs.createReadStream(document.originalFilePath));
      form.append('documentID', document.id);
      form.append('mode', document.mode);

      if (document.mode === ProcessingMode.FORMAT && document.jobDescription) {
        form.append('jobDescription', document.jobDescription);
      }

      // get microservice url and api key
      const microServiceUrl =
        this.configService.get<string>('MICROSERVICE_URL');
      const apiKey = this.configService.get<string>('MICROSERVICE_API_KEY');

      if (!microServiceUrl) {
        throw new InternalServerErrorException(
          'Microservice URL not configured',
        );
      }

      // send to the microservice
      const response = await firstValueFrom(
        this.httpService
          .post(`${microServiceUrl}/process`, form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${apiKey || ''}`,
            },
          })
          .pipe(
            catchError((error) => {
              this.logger.error(`Error calling microservice: ${error.message}`);
              // this.documentsService.updateStatus(
              //   documentID,
              //   ProcessingStatus.FAILED,
              // );
              throw new InternalServerErrorException(
                'Failed to reach microservice',
              );
            }),
          ),
      );
      this.logger.log(
        `Document ${documentID} sent for processing. Response status: ${response.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document ${documentID}: ${error.message}`,
      );
      await this.documentsService.updateStatus(
        documentID,
        ProcessingStatus.FAILED,
      );
      throw error;
    }
  }

  async handleProcessingResult(result: ProcessingResultDto): Promise<void> {
    try {
      this.logger.log(
        `Received processing result for document ${result.documentID}`,
      );

      await this.documentsService.updateProcessingResult(result.documentID, {
        formattedFilePath: result.formattedFilePath,
        coverLetterPath: result.coverLetterPath,
        feedback: result.feedback,
        status:
          result.status === ProcessingStatus.COMPLETED
            ? ProcessingStatus.COMPLETED
            : ProcessingStatus.FAILED,
        // error: result.error,
      });

      this.logger.log(
        `Document ${result.documentID} processing completed successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle processing result for document ${result.documentID}: ${error.message}`,
      );
      await this.documentsService.updateStatus(
        result.documentID,
        ProcessingStatus.FAILED,
      );
    }
  }
}
