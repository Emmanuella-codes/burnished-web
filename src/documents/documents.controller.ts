import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  Req,
  InternalServerErrorException,
  Get,
  Param,
  NotFoundException,
  ParseUUIDPipe,
  Res,
  Delete,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProcessingMode } from 'src/processing/enums/processing-mode.enum';
import { ProcessingStatus } from 'src/processing/enums/processing-status.enum';
import { ProcessingService } from 'src/processing/processing.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { Response } from 'express';
import * as path from 'path';

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
      limits: {
        fileSize: 10 * 1024 * 1024, // 10mb
      },
      fileFilter: (req, file, cb) => {
        // check file types - allow pdf and docx
        if (
          file.mimetype === 'application/pdf' ||
          file.mimetype ===
            '/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
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
    const { mode, jobDescription } = body;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!body.mode) {
      throw new BadRequestException('Invalid processing mode');
    }

    // formatting mode
    if (body.mode === ProcessingMode.FORMAT && !body.jobDescription) {
      throw new BadRequestException(
        'Job description is required for formatting mode',
      );
    }

    try {
      // create document record
      const document = await this.documentsService.create({
        userID: req.user.id,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        mode,
        jobDescription,
        status: ProcessingStatus.PENDING,
      });
      // save file to disk
      const filePath = await this.documentsService.saveFile(file, document.id);
      // update document with file path
      await this.documentsService.update(document.id, {
        originalFilePath: filePath,
      });
      //start processing
      await this.processingService.processDocument(document.id);

      return {
        id: document.id,
        filename: file.originalname,
        status: ProcessingStatus.PROCESSING,
        message: 'Document uploaded successfully and is being processed',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process document: ${error.message}`,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserDocuments(@Req() req) {
    return this.documentsService.findByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDocument(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const document = await this.documentsService.findOne(id);

    //check if user owns this document
    if (document.userID !== req.user.id) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  @Get('download/formatted/:id')
  async downloadFormattedDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.documentsService.findOne(id);
    if (document.userID !== req.user.id) {
      throw new NotFoundException('Document not found');
    }
    if (!document.formattedFilePath) {
      throw new NotFoundException('Formatted document not available');
    }

    const fileStream = await this.documentsService.getFileStream(
      document.formattedFilePath,
    );
    const filename = path.basename(document.formattedFilePath);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    fileStream.pipe(res);
  }

  @Get('download/coverLetter/:id')
  @UseGuards(JwtAuthGuard)
  async downloadCoverLetter(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.findOne(id);
    if (document.userID !== req.user.id) {
      throw new NotFoundException('Document not found');
    }
    if (!document.coverLetterPath) {
      throw new NotFoundException('Cover letter not available');
    }

    const fileStream = await this.documentsService.getFileStream(
      document.coverLetterPath,
    );
    const filename = path.basename(document.coverLetterPath);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    fileStream.pipe(res);
  }

  @Get('feedback/:id')
  @UseGuards(JwtAuthGuard)
  async getDocumentFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    const document = await this.documentsService.findOne(id);

    if (document.userID !== req.user.id) {
      throw new NotFoundException('Document not found');
    }

    if (!document.feedback) {
      throw new NotFoundException('Feedback not available for this document');
    }

    return { feedback: document.feedback };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDocument(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const document = await this.documentsService.findOne(id);

    if (document.userID !== req.user.id) {
      throw new NotFoundException('Document not found');
    }

    await this.documentsService.delete(id);
    return { message: 'Document deleted successfully' };
  }
}
