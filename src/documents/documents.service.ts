import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ProcessingStatus } from '../processing/enums/processing-status.enum';
import * as fs from 'fs/promises';
import { Readable } from 'stream';
import * as fsSync from 'fs';
import { ProcessingMode } from '../processing/enums/processing-mode.enum';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly DAILY_LIMIT = 20;

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    
    private configService: ConfigService,
  ) {}

  async checkAndIncrement(username: string): Promise<{
    allowed: boolean;
    dailyRemaining: number;
    message?: string;
    }> {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let quota = await this.documentRepository.findOne({
        where: { user: username },
      });

      // create new quota record if doesn't exist
      if (!quota) {
        quota = this.documentRepository.create({
          user: username,
          dailyCount: 0,
          dailyResetDate: today,
        });
        await this.documentRepository.save(quota);
      }

      // reset daily count if new day
      const resetDate = new Date(quota.dailyResetDate);
      if (resetDate < today) {
        quota.dailyCount = 0;
        quota.dailyResetDate = today;
      }

      if (quota.dailyCount >= this.DAILY_LIMIT) {
        this.logger.warn(`User ${username} exceeded daily limit`);
        return {
          allowed: false,
          dailyRemaining: 0,
          message: `Daily limit of ${this.DAILY_LIMIT} documents reached. Resets at midnight.`,
        };
      }

      // increment counters
      quota.dailyCount++;
      quota.totalProcessed++
      await this.documentRepository.save(quota);

      this.logger.log(
        `User ${username} processed document. Daily: ${quota.dailyCount}/${this.DAILY_LIMIT}`,
      );

      return {
        allowed: true,
        dailyRemaining: this.DAILY_LIMIT - quota.dailyCount,
      };
  }

  async rollback(username: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { user: username },
    });

    if (document && document.dailyCount > 0) document.dailyCount--;
    if (document && document.totalProcessed > 0)  document.totalProcessed--;
    await this.documentRepository.save(document);
    this.logger.log(`Rolled back processing count for user ${username}`);
    
  }

  async getUsage(username: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [dailyCount, totalCount] = await Promise.all([
      this.documentRepository.count({
        where: {
          user: username,
          createdAt: MoreThanOrEqual(todayStart),
        },
      }),
      this.documentRepository.count({ where: { user: username } })
    ]);

    return {
      totalProcessed: totalCount,
      dailyCount,
      dailyLimit: this.DAILY_LIMIT,
      dailyRemaining: this.DAILY_LIMIT - dailyCount,
    };
  }

  async create(documentData: Partial<Document>): Promise<Document> {
    const document = this.documentRepository.create(documentData);
    try {
      return this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(`Failed to create document: ${error.message}`);
      throw new InternalServerErrorException('Failed to create document');
    }
  }

  async findByUser(username: string): Promise<Document | null> {
    return this.documentRepository.findOne({ where: { user: username } });
  }

  async save(document: Document): Promise<Document> {
    return this.documentRepository.save(document);
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async updateProcessingResult(
    id: string,
    updates: {
      formattedResume?: Record<string, any>;
      coverLetter?: string;
      feedback?: string;
      status?: ProcessingStatus;
      // error?: string;
    },
  ): Promise<Document> {
    const document = await this.findOne(id);

    Object.assign(document, {
      formattedResume: updates.formattedResume,
      coverLetter: updates.coverLetter,
      feedback: updates.feedback,
      // error: updates.error,
    });

    try {
      return await this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(
        `Failed to update processing result for document ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to update processing result',
      );
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    try {
      await fs.access(filePath);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }

  async getFileStream(filePath: string): Promise<Readable> {
    try {
      // check if file exists
      await fs.access(filePath);
      // create a read stream
      return fsSync.createReadStream(filePath);
    } catch (error) {
      this.logger.error(`Failed to stream file ${filePath}: ${error.message}`);
      throw new NotFoundException(`File not found: ${filePath}`);
    }
  }
}
