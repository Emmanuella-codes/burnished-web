// import { User } from 'src/auth/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessingMode } from '../../processing/enums/processing-mode.enum';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user: string;

  @Column({ type: 'int', default: 0 })
  totalProcessed: number;

  @Column({ type: 'int', default: 0 })
  dailyCount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  dailyResetDate: Date;

  @Column()
  lastFilename: string;

  @Column()
  mimeType: string;

  @Column({
    type: 'enum',
    enum: ProcessingMode,
  })
  lastMode: ProcessingMode;

  @Column({ type: 'timestamp' })
  lastProcessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
