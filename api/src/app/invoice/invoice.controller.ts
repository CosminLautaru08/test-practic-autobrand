import {
  BadRequestException,
  Controller,
  Post,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';

@UseGuards(JwtAuthGuard)
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.includes('pdf')) {
          return callback(
            new UnsupportedMediaTypeException(
              'Only PDF invoice files are supported.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadInvoice(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a PDF invoice to upload.');
    }

    const csv = await this.invoiceService.processInvoice(file.buffer);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.csv');

    return res.send(csv);
  }
}
