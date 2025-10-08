import { ConfigService } from '@nestjs/config';
import {
  Inject,
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
import * as path from 'path';
import { Readable } from 'stream';
import * as fsSync from 'fs';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,

    @Inject('SUPABASE_CLIENT')
    private supabase: SupabaseClient,
    
    private configService: ConfigService,
  ) {}

  async create(documentData: Partial<Document>): Promise<Document> {
    const document = this.documentRepository.create(documentData);
    try {
      return this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(`Failed to create document: ${error.message}`);
      throw new InternalServerErrorException('Failed to create document');
    }
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      // relations: ['user'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  // async findByUser(userID: string): Promise<Document[]> {
  //   return this.documentRepository.find({
  //     where: { userID },
  //     order: { createdAt: 'DESC' },
  //   });
  // }

  async update(id: string, updateData: Partial<Document>): Promise<Document> {
    const document = await this.findOne(id);
    Object.assign(document, updateData);
    try {
      return this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(`Failed to update document ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update document');
    }
  }

  async updateStatus(id: string, status: ProcessingStatus): Promise<Document> {
    const document = await this.findOne(id);
    document.status = status;
    try {
      return this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(
        `Failed to update status for document ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to update document status',
      );
    }
  }

  async updateProcessingResult(
    id: string,
    updates: {
      formattedFile?: string;
      coverLetter?: string;
      feedback?: string;
      status?: ProcessingStatus;
      // error?: string;
    },
  ): Promise<Document> {
    const document = await this.findOne(id);

    Object.assign(document, {
      formattedFile: updates.formattedFile,
      coverLetter: updates.coverLetter,
      feedback: updates.feedback,
      status: updates.status || document.status,
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

  async saveFile(
    file: Express.Multer.File,
    documentID: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `raw/${documentID}${ext}`;

    try {
      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new InternalServerErrorException(`Failed to upload file: ${uploadError.message}`)
      }
      
      // get public URL
      const { data: publicData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filename);

      this.logger.log(`Saved file for document ${documentID}`);
      return publicData.publicUrl;
      
    } catch (error) {
      this.logger.error(
        `Failed to save file for document ${documentID}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to save file');
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

  async delete(id: string): Promise<void> {
    const document = await this.findOne(id);

    try {
      const filePaths = [
        document.originalFilePath,
        document.formattedFilePath,
        document.coverLetterPath,
      ].filter(Boolean);

      for (const filePath of filePaths) {
        try {
          await fs.unlink(filePath);
          this.logger.log(`Deleted file ${filePath} for document ${id}`);
        } catch (error) {
          this.logger.warn(
            `Failed to delete file ${filePath}: ${error.message}`,
          );
        }
      }

      await this.documentRepository.remove(document);
      this.logger.log(`Deleted document ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete document');
    }
  }
}
