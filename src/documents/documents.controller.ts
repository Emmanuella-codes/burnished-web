import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProcessingMode } from '../processing/enums/processing-mode.enum';
import { ProcessingStatus } from '../processing/enums/processing-status.enum';
import { ProcessingService } from '../processing/processing.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import * as multer from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly processingService: ProcessingService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(), // buffer in memory
      limits: { fileSize: 10 * 1024 * 1024 }, // 10mb
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        // check file types - allow pdf and docx
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only PDF and DOCX files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException('No CV file uploaded');
    }

    const { mode, jobDescription } = body;

    if (!mode) {
      throw new BadRequestException(
        'mode is required'
      )
    }

    // formatting mode
    if (mode === ProcessingMode.FORMAT && !jobDescription) {
      throw new BadRequestException(
        'Job description is required for formatting mode',
      );
    }

    // cover letter
    if (mode === ProcessingMode.LETTER && !jobDescription) {
      throw new BadRequestException(
        'Job description is required for generating cover letter',
      );
    }

    // check quota before processing
    const quotaCheck = await this.documentsService.checkAndIncrement(req.user.name)
    if (!quotaCheck.allowed) {
      throw new BadRequestException(quotaCheck.message);
    }

    try {
      //start processing
      const result = await this.processingService.processDocument(file, mode, jobDescription);
      if (!result || result.error) {
        throw new Error('Document processing failed');
      }

      let document = await this.documentsService.findByUser(req.user.name);

      if (document) {
        document.lastFilename = file.originalname;
        document.mimeType = file.mimetype;
        document.lastMode = mode;
        document.lastProcessedAt = new Date();
        document =  await this.documentsService.save(document);
      } else {
        document = await this.documentsService.create({
          user: req.user.name,
          lastFilename: file.originalname,
          mimeType: file.mimetype,
          lastMode: mode,
          lastProcessedAt: new Date(),
        })
      }
      
      return ApiResponse.success('Document processed successfully', {
        documentID: document.id,
        filename: file.originalname,
        status: ProcessingStatus.COMPLETED,
        feedback: result.feedback,
        formattedResume: result.formattedResume,
        coverLetter: result.coverLetter,
        quota: {
          dailyRemaining: quotaCheck.dailyRemaining
        }
      });
    } catch (error) {
      await this.documentsService.rollback(req.user.name);
      throw new BadRequestException(`Document processing failed: ${error.message}`);
    }
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Req() req) {
    const usage = await this.documentsService.getUsage(req.user.name);
    return ApiResponse.success('Usage retrieved successfully', usage);
  }
}
