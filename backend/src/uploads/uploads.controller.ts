import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('receipt')
  @ApiOperation({ summary: 'Upload a receipt image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body('groupId') groupId: string,
    @Body('expenseId') expenseId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!groupId) throw new BadRequestException('groupId is required');
    if (!expenseId) throw new BadRequestException('expenseId is required');
    return this.uploadsService.uploadReceipt(file, groupId, expenseId);
  }
}
