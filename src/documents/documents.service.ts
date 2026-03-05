import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Repository } from 'typeorm';
import { ProcessingStatus } from '../processing/enums/processing-status.enum';
import * as fs from 'fs/promises';
import { Readable } from 'stream';
import * as fsSync from 'fs';
import { ProcessingMode } from '../processing/enums/processing-mode.enum';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly DAILY_LIMIT = 2;

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,

    private configService: ConfigService,
  ) {}

  async checkQuota(username: string): Promise<{
    allowed: boolean;
    dailyRemaining: number;
    message?: string;
  }> {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    try {
      const quota = await this.documentRepository.findOne({
        where: { user: username },
      });

      if (!quota) {
        return {
          allowed: true,
          dailyRemaining: this.DAILY_LIMIT,
        };
      }

      let dailyCount = quota.dailyCount;
      if (new Date(quota.dailyResetDate) < todayUTC) {
        dailyCount = 0;
      }

      if (dailyCount >= this.DAILY_LIMIT) {
        return {
          allowed: false,
          dailyRemaining: 0,
          message: `Daily limit of ${this.DAILY_LIMIT} reached. Resets at 00:00 UTC.`,
        };
      }

      return {
        allowed: true,
        dailyRemaining: this.DAILY_LIMIT - dailyCount,
      };
    } catch (error) {
      this.logger.error('Quota check failed', error);
      throw error;
    }
  }

  async commitUsage(
    username: string,
    updates: {
      lastFilename: string;
      mimeType: string;
      lastMode: ProcessingMode;
      lastProcessedAt: Date;
    },
  ): Promise<{ dailyRemaining: number; document: Document }> {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    return this.documentRepository.manager.transaction(async (manager) => {
      let document = await manager.findOne(Document, {
        where: { user: username },
        lock: { mode: 'pessimistic_write' },
      });

      if (!document) {
        document = manager.create(Document, {
          user: username,
          dailyCount: 0,
          totalProcessed: 0,
          dailyResetDate: todayUTC,
        });
      }

      if (new Date(document.dailyResetDate) < todayUTC) {
        document.dailyCount = 0;
        document.dailyResetDate = todayUTC;
      }

      if (document.dailyCount >= this.DAILY_LIMIT) {
        throw new BadRequestException(
          `Daily limit of ${this.DAILY_LIMIT} reached. Resets at 00:00 UTC.`,
        );
      }

      document.dailyCount++;
      document.totalProcessed++;
      document.lastFilename = updates.lastFilename;
      document.mimeType = updates.mimeType;
      document.lastMode = updates.lastMode;
      document.lastProcessedAt = updates.lastProcessedAt;

      document = await manager.save(document);

      return {
        dailyRemaining: this.DAILY_LIMIT - document.dailyCount,
        document,
      };
    });
  }

  async getUsage(username: string) {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const document = await this.documentRepository.findOne({
      where: { user: username },
    });

    if (!document) {
      return {
        totalProcessed: 0,
        dailyCount: 0,
        dailyLimit: this.DAILY_LIMIT,
        dailyRemaining: this.DAILY_LIMIT,
      };
    }

    let dailyCount = document.dailyCount;
    if (new Date(document.dailyResetDate) < todayUTC) {
      dailyCount = 0;
    }

    return {
      totalProcessed: document.totalProcessed,
      dailyCount,
      dailyLimit: this.DAILY_LIMIT,
      dailyRemaining: this.DAILY_LIMIT - dailyCount,
    };
  }

  async findByUser(username: string): Promise<Document | null> {
    return this.documentRepository.findOne({ where: { user: username } });
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
