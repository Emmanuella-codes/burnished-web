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
  @Transform(({ obj }) => !!obj.feedback, { toClassOnly: true }) //transformations only apply when serializing to the response
  hasFeedback: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.status === ProcessingStatus.COMPLETED && obj.formattedFilePath
        ? `/api/documents/download/${obj.id}`
        : null,
    { toClassOnly: true },
  )
  downloadUrl?: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.status === ProcessingStatus.COMPLETED && obj.coverLetterPath
        ? `/api/documents/cover-letter/${obj.id}`
        : null,
    { toClassOnly: true },
  )
  coverLetterUrl?: string;

  constructor(partial: Partial<DocumentResponseDto>) {
    Object.assign(this, partial);
  }
}
