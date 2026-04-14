import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';

// ─── Mock AWS SDK ─────────────────────────────────────────────────────────────

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

// ─── Mock sharp ───────────────────────────────────────────────────────────────
// jest.mock() is hoisted — factory must not reference outer const/let variables.

jest.mock('sharp', () => {
  const toBuffer = jest.fn().mockResolvedValue(Buffer.from('resized'));
  const resize = jest.fn().mockReturnValue({ toBuffer });
  const sharp = jest.fn().mockReturnValue({ resize });
  // Attach sub-mocks so tests can reach them via the module reference
  (sharp as any).__resize = resize;
  (sharp as any).__toBuffer = toBuffer;
  return sharp;
});

// ─── Mock uuid ────────────────────────────────────────────────────────────────

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(s3Enabled = true): ConfigService {
  const values: Record<string, string> = s3Enabled
    ? {
        S3_ACCESS_KEY_ID: 'AKID',
        S3_SECRET_ACCESS_KEY: 'SECRET',
        S3_BUCKET_NAME: 'my-bucket',
        S3_PUBLIC_URL: 'https://cdn.example.com',
        S3_REGION: 'auto',
      }
    : {};

  return {
    get: jest.fn().mockImplementation((key: string, fallback?: string) => values[key] ?? fallback ?? ''),
  } as unknown as ConfigService;
}

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'receipt.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
    stream: undefined as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('UploadsService', () => {
  afterEach(() => jest.clearAllMocks());

  async function buildService(s3Enabled = true) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: ConfigService, useValue: makeConfig(s3Enabled) },
      ],
    }).compile();
    return module.get<UploadsService>(UploadsService);
  }

  // ─── uploadReceipt() ─────────────────────────────────────────────────────────

  describe('uploadReceipt()', () => {
    it('throws BadRequestException when S3 is not configured', async () => {
      const service = await buildService(false);

      await expect(
        service.uploadReceipt(makeFile(), 'group-1', 'exp-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for disallowed MIME type', async () => {
      const service = await buildService();

      await expect(
        service.uploadReceipt(makeFile({ mimetype: 'application/pdf' }), 'group-1', 'exp-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when file exceeds 10 MB limit', async () => {
      const service = await buildService();

      await expect(
        service.uploadReceipt(makeFile({ size: 11 * 1024 * 1024 }), 'group-1', 'exp-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('resizes image, uploads to S3, and returns url + signedUrl', async () => {
      const service = await buildService();
      mockS3Send.mockResolvedValue({});

      const result = await service.uploadReceipt(makeFile(), 'group-1', 'exp-1');

      // sharp was called with the file buffer
      const mockSharp = jest.requireMock('sharp') as jest.Mock;
      expect(mockSharp).toHaveBeenCalledWith(expect.any(Buffer));
      expect((mockSharp as any).__resize).toHaveBeenCalledWith({ width: 1920, withoutEnlargement: true });

      // S3 put was called once
      expect(mockS3Send).toHaveBeenCalledTimes(1);

      // Returns correct URLs
      expect(result.url).toBe('https://cdn.example.com/receipts/group-1/exp-1/fixed-uuid.jpeg');
      expect(result.signedUrl).toBe('https://s3.example.com/signed-url');
    });

    it('accepts image/png and image/webp MIME types', async () => {
      const service = await buildService();
      mockS3Send.mockResolvedValue({});

      for (const mimetype of ['image/png', 'image/webp']) {
        jest.clearAllMocks();
        mockS3Send.mockResolvedValue({});
        await expect(
          service.uploadReceipt(makeFile({ mimetype }), 'group-1', 'exp-1'),
        ).resolves.toBeDefined();
      }
    });
  });
});
