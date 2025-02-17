import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProcessingMode } from '../../processing/enums/processing-mode.enum';
import { UploadedFile } from '@nestjs/common';

export class UploadDocumentDto {
  @UploadedFile()
  file: Express.Multer.File
  
  @IsEnum(ProcessingMode)
  mode: ProcessingMode;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
