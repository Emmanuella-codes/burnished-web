// import { User } from 'src/auth/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessingStatus } from '../../processing/enums/processing-status.enum';
import { ProcessingMode } from '../../processing/enums/processing-mode.enum';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column({ nullable: true })
  originalFilePath: string;

  @Column({ nullable: true })
  formattedFilePath: string;

  @Column({ nullable: true })
  coverLetterPath: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  status: ProcessingStatus;

  @Column({
    type: 'enum',
    enum: ProcessingMode,
    nullable: true,
  })
  mode: ProcessingMode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
