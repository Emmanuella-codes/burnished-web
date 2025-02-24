import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProcessingStatus } from '../enums/processing-status.enum';

export class ProcessingResultDto {
  @IsUUID()
  documentID: string;

  @IsEnum(ProcessingStatus)
  status: ProcessingStatus;

  @IsOptional()
  @IsString()
  formattedFilePath?: string;

  @IsOptional()
  @IsString()
  coverLetterPath?: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  error?: string;
}
