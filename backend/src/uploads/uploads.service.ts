import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'auto'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: false,
    });
    this.bucket = config.getOrThrow<string>('S3_BUCKET_NAME');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL', '');
  }

  async uploadReceipt(
    file: Express.Multer.File,
    groupId: string,
    expenseId: string,
  ): Promise<{ url: string; signedUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    // Resize to max 1920px wide via Sharp
    const resized = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .toBuffer();

    const ext = file.mimetype.split('/')[1];
    const key = `receipts/${groupId}/${expenseId}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: resized,
        ContentType: file.mimetype,
        Metadata: { groupId, expenseId },
      }),
    );

    // Generate signed URL (1 hour expiry)
    const signedUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log({ key, groupId, expenseId }, 'Receipt uploaded');
    return { url, signedUrl };
  }
}
