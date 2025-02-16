import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProcessingMode } from '../enums/processinf-mode.enum';

export class UploadDocumentDto {
  @IsEnum(ProcessingMode)
  mode: ProcessingMode;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
