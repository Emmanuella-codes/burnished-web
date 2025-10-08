import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProcessingStatus } from '../enums/processing-status.enum';

export class ProcessingResultDto {
  @IsUUID()
  documentID: string;

  @IsEnum(ProcessingStatus)
  status: ProcessingStatus;

  @IsOptional()
  @IsString()
  formattedFile?: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsString()
  feedback?: Record<string, any>;

  // @IsOptional()
  // @IsString()
  // error?: string;
}
