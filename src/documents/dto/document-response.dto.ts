import { ProcessingStatus } from '../../processing/enums/processing-status.enum';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class DocumentResponseDto {
  @Expose()
  id: string;

  @Expose()
  originalFilename: string;

  @Expose()
  mimeType: string;

  @Expose()
  status: ProcessingStatus;

  @Expose()
  @Transform(({ obj }) => (obj.feedback ? true : false))
  hasFeedback: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  downloadUrl?: string;

  @Expose()
  coverLetterUrl?: string;

  constructor(partial: Partial<DocumentResponseDto>) {
    Object.assign(this, partial);

    if (
      this.status === ProcessingStatus.COMPLETED &&
      partial.formattedFilePath
    ) {
    }
  }
}
