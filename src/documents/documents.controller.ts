import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  UseGuards,
  Req,
  // InternalServerErrorException,
  // Get,
  // Param,
  // NotFoundException,
  // ParseUUIDPipe,
  // Res,
  // Delete,
  // ClassSerializerInterceptor,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProcessingMode } from '../processing/enums/processing-mode.enum';
import { ProcessingStatus } from '../processing/enums/processing-status.enum';
import { ProcessingService } from '../processing/processing.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
// import { Response } from 'express';
// import * as path from 'path';
// import { DocumentResponseDto } from './dto/document-response.dto';
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

    try {
      // create document record
      const document = await this.documentsService.create({
        user: req.user.name,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        mode,
        status: ProcessingStatus.PENDING,
      });
      // save file to disk
      // const filePath = await this.documentsService.saveFile(file, document.id);
      // // update document with file path
      // await this.documentsService.update(document.id, {
      //   originalFilePath: filePath,
      // });

      //start processing
      const result = await this.processingService.processDocument(file, mode, jobDescription);

      return ApiResponse.success('Document processed successfully', {
        id: document.id,
        filename: file.originalname,
        status: ProcessingStatus.COMPLETED,
        feedback: result.feedback,
        formattedResume: result.formattedResume,
        coverLetter: result.coverLetter,
      });
    } catch (error) {
      return ApiResponse.failure('Failed to process document', error.message);
    }
  }

  // @Get()
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(ClassSerializerInterceptor)
  // async getUserDocuments(@Req() req): Promise<DocumentResponseDto[]> {
  //   const documents = await this.documentsService.findByUser(req.user.id);
  //   return documents.map((doc) => new DocumentResponseDto(doc));
  // }

  // @Get(':id')
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(ClassSerializerInterceptor)
  // async getDocument(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
  //   const document = await this.documentsService.findOne(id);

  //   //check if user owns this document
  //   if (document.userID !== req.user.id) {
  //     throw new NotFoundException('Document not found');
  //   }
  //   return new DocumentResponseDto(document);
  // }

  // @Get('download/:id')
  // // @UseGuards(JwtAuthGuard)
  // async downloadFormattedDocument(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Req() req,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const document = await this.documentsService.findOne(id);
  //   if (document.userID !== req.user.id) {
  //     throw new NotFoundException('Document not found');
  //   }
  //   if (!document.formattedFilePath) {
  //     throw new NotFoundException('Formatted document not available');
  //   }

  //   const fileStream = await this.documentsService.getFileStream(
  //     document.formattedFilePath,
  //   );
  //   const filename = path.basename(document.formattedFilePath);

  //   res.set({
  //     'Content-Type': document.mimeType || 'application/pdf',
  //     'Content-Disposition': `attachment; filename="${filename}"`,
  //   });

  //   fileStream.pipe(res);
  // }

  // @Get('cover-letter/:id')
  // @UseGuards(JwtAuthGuard)
  // async downloadCoverLetter(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Req() req,
  //   @Res() res: Response,
  // ) {
  //   const document = await this.documentsService.findOne(id);
  //   if (document.userID !== req.user.id) {
  //     throw new NotFoundException('Document not found');
  //   }
  //   if (!document.coverLetterPath) {
  //     throw new NotFoundException('Cover letter not available');
  //   }

  //   const fileStream = await this.documentsService.getFileStream(
  //     document.coverLetterPath,
  //   );
  //   const filename = path.basename(document.coverLetterPath);

  //   res.set({
  //     'Content-Type': 'application/pdf',
  //     'Content-Disposition': `attachment; filename="${filename}"`,
  //   });

  //   return fileStream.pipe(res);
  // }

  // @Get('feedback/:id')
  // @UseGuards(JwtAuthGuard)
  // async getDocumentFeedback(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Req() req,
  // ) {
  //   const document = await this.documentsService.findOne(id);

  //   if (document.userID !== req.user.id) {
  //     throw new NotFoundException('Document not found');
  //   }

  //   if (!document.feedback) {
  //     throw new NotFoundException('Feedback not available for this document');
  //   }

  //   return { feedback: document.feedback };
  // }

//   @Delete(':id')
//   @UseGuards(JwtAuthGuard)
//   async deleteDocument(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
//     const document = await this.documentsService.findOne(id);

//     if (document.userID !== req.user.id) {
//       throw new NotFoundException('Document not found');
//     }

//     await this.documentsService.delete(id);
//     return { message: 'Document deleted successfully' };
//   }
}
