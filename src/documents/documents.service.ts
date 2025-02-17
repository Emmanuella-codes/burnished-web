import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Repository } from 'typeorm';
import { ProcessingStatus } from '../processing/enums/processing-status.enum';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private configService: ConfigService,
  ) {}

  async create(documentData: Partial<Document>): Promise<Document> {
    const document = this.documentRepository.create(documentData);
    return this.documentRepository.save(document);
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async findByUser(userID: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { userID },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateData: Partial<Document>): Promise<Document> {
    const document = await this.findOne(id);
    Object.assign(document, updateData);
    return this.documentRepository.save(document);
  }

  async updateStatus(id: string, status: ProcessingStatus): Promise<Document> {
    const document = await this.findOne(id);
    document.status = status;
    return this.documentRepository.save(document);
  }

  async updateProcessingResult(
    id: string,
    updates: {
      formattedFilePath?: string;
      coverLetterPath?: string;
      feedback?: string;
      status?: ProcessingStatus;
    },
  ): Promise<Document> {
    const document = await this.findOne(id);

    Object.assign(document, updates);
    return this.documentRepository.save(document);
  }

  async saveFile(
    file: Express.Multer.File,
    documentID: string,
  ): Promise<string> {
    const uploadDir = this.configService.get<string>(
      'uploads.directory',
      'uploads',
    );

    await fs.mkdir(uploadDir, { recursive: true });

    // create filename using document ID to prevent collisions
    const filename = `${documentID}-${file.originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, filename);

    // write file to disk
    await fs.writeFile(filePath, file.buffer);
    return filePath;
  }

  async delete(id: string): Promise<void> {
    const document = await this.findOne(id);

    try {
      if (document.originalFilePath) {
        await fs.unlink(document.originalFilePath);
      }
      if (document.formattedFilePath) {
        await fs.unlink(document.formattedFilePath);
      }
      if (document.coverLetterPath) {
        await fs.unlink(document.coverLetterPath);
      }
    } catch (error) {
      console.error('Error deleting document files:', error);
    }

    await this.documentRepository.remove(document);
  }
}
