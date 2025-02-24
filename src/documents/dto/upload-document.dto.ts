import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProcessingMode } from '../../processing/enums/processing-mode.enum';

export class UploadDocumentDto {
  @IsEnum(ProcessingMode)
  mode: ProcessingMode;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
