import { IsEnum, IsString } from 'class-validator';
import { ProcessingStatus } from '../enums/processing-status.enum';

export class DocumentResponse {
  @IsEnum(ProcessingStatus)
  status: ProcessingStatus;

  @IsString()
  jobDescription?: string;
}
