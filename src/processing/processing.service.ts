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

  async processDocument(documentID: string, jobDescription?: string): Promise<any> {
    try {
      const document = await this.documentsService.findOne(documentID);

      // check if original file exists
      const fileExists = await fs.promises
        .stat(document.originalFilePath)
        .then(() => true)
        .catch(() => false);

        if (!fileExists) {
          throw new InternalServerErrorException("Original file not found");
        }

      //create form data
      const form = new FormData();
      form.append('file', fs.createReadStream(document.originalFilePath));
      form.append('documentID', document.id);
      form.append('mode', document.mode);

      if (document.mode === ProcessingMode.FORMAT && jobDescription) {
        form.append('jobDescription', jobDescription);
      }

      // get microservice url and api key
      const microServiceUrl =
        this.configService.get<string>('MICROSERVICE_URL');
      const apiKey = this.configService.get<string>('MICROSERVICE_API_KEY');

      const headers = {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      }

      if (!microServiceUrl) {
        throw new InternalServerErrorException(
          'Microservice URL not configured',
        );
      }
      if (!apiKey) {
        throw new InternalServerErrorException(
          'Microservice API key not configured',
        );
      }

      // send to the microservice
      const { data } = await firstValueFrom(
        this.httpService
          .post(`${microServiceUrl}/process`, form, { headers })
          .pipe(
            catchError((error) => {
              const msg = error.response?.data?.message || error.message;
              this.logger.error(`Error calling microservice: ${msg}`);
              throw new InternalServerErrorException(
                `Microservice error: ${msg}`,
              );
            }),
          ),
      );
      this.logger.log(
        `Document ${documentID} processed successfully. Returning feedback.`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to process document ${documentID}: ${error.message}`,
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
        formattedFile: result.formattedFile,
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
      await this.documentsService.updateStatus(
        result.documentID,
        ProcessingStatus.FAILED,
      );
    }
  }
}
