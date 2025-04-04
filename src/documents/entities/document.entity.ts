import { User } from 'src/auth/entities/user.entity';
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
import { ProcessingMode } from 'src/processing/enums/processing-mode.enum';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userID' })
  user: User;

  @Column()
  userID: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column()
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

  @Column({ nullable: true })
  jobDescription: string;

  @Column({
    type: 'enum',
    enum: ProcessingMode,
  })
  mode: ProcessingMode;

  @Column({ type: 'jsonb', nullable: true })
  feedback: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
