import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../common/prisma/prisma.service';

const mockHealthCheck = jest.fn();
const mockPingCheck = jest.fn().mockResolvedValue({ database: { status: 'up' } });
const mockCheckHeap = jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } });

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    mockHealthCheck.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: mockHealthCheck,
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: mockPingCheck,
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: mockCheckHeap,
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('tanımlanmış olmalı', () => {
    expect(controller).toBeDefined();
  });

  describe('live()', () => {
    it('health.check çağırır', () => {
      mockHealthCheck.mockReturnValue({ status: 'ok', info: {}, error: {}, details: {} });
      controller.live();
      expect(mockHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('check fonksiyonlarından biri memory_heap kontrolü içerir', () => {
      mockHealthCheck.mockImplementation((fns: (() => unknown)[]) => {
        fns.forEach(fn => fn());
        return { status: 'ok' };
      });
      controller.live();
      expect(mockCheckHeap).toHaveBeenCalledWith('memory_heap', 512 * 1024 * 1024);
    });
  });

  describe('ready()', () => {
    it('health.check çağırır', () => {
      mockHealthCheck.mockReturnValue({ status: 'ok', info: {}, error: {}, details: {} });
      controller.ready();
      expect(mockHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('check fonksiyonlarından biri veritabanı ping kontrolü içerir', () => {
      mockHealthCheck.mockImplementation((fns: (() => unknown)[]) => {
        fns.forEach(fn => fn());
        return { status: 'ok' };
      });
      controller.ready();
      expect(mockPingCheck).toHaveBeenCalledWith('database', expect.anything());
    });
  });
});
