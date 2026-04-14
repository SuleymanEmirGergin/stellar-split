import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

const USER = { sub: 'user-uuid' } as any;

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file', originalname: 'receipt.jpg', encoding: '7bit',
    mimetype: 'image/jpeg', buffer: Buffer.from('img'), size: 1024,
    stream: undefined as any, destination: '', filename: '', path: '',
    ...overrides,
  };
}

describe('UploadsController', () => {
  let controller: UploadsController;
  const mockService = { uploadReceipt: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: UploadsService, useValue: mockService }],
    }).compile();
    controller = module.get(UploadsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('throws BadRequestException when no file is provided', async () => {
    await expect(controller.uploadReceipt(undefined as any, 'grp-1', 'exp-1', USER))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when groupId is missing', async () => {
    await expect(controller.uploadReceipt(makeFile(), '', 'exp-1', USER))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when expenseId is missing', async () => {
    await expect(controller.uploadReceipt(makeFile(), 'grp-1', '', USER))
      .rejects.toThrow(BadRequestException);
  });

  it('delegates to service and returns result', async () => {
    const result = { url: 'https://cdn.example.com/key.jpg', signedUrl: 'https://s3.example.com/signed' };
    mockService.uploadReceipt.mockResolvedValue(result);

    await expect(controller.uploadReceipt(makeFile(), 'grp-1', 'exp-1', USER))
      .resolves.toEqual(result);
    expect(mockService.uploadReceipt).toHaveBeenCalledWith(expect.any(Object), 'grp-1', 'exp-1');
  });
});
