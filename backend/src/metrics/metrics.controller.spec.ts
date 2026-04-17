import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

// prom-client registry'sini mock'la — gerçek metrics toplamayı atla
jest.mock('../common/observability/metrics', () => ({
  metricsRegistry: {
    metrics: jest.fn().mockResolvedValue('# HELP test\ntest_metric 1'),
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  },
}));

function mockResponse(headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const setHeader = jest.fn();
  const send = jest.fn();
  return {
    setHeader,
    send,
    req: {
      headers,
      query,
    },
  } as unknown as import('express').Response;
}

describe('MetricsController', () => {
  let controller: MetricsController;
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...OLD_ENV };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('tanımlanmış olmalı', () => {
    expect(controller).toBeDefined();
  });

  describe('METRICS_SECRET tanımlı değilken', () => {
    it('herhangi bir token olmadan metrics döner', async () => {
      delete process.env.METRICS_SECRET;
      const res = mockResponse();
      await controller.getMetrics(res);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('test_metric'));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.any(String));
    });
  });

  describe('METRICS_SECRET tanımlıyken', () => {
    const SECRET = 'super-secret-token';

    beforeEach(() => {
      process.env.METRICS_SECRET = SECRET;
    });

    it('doğru Authorization Bearer token ile metrics döner', async () => {
      const res = mockResponse({ authorization: `Bearer ${SECRET}` });
      await controller.getMetrics(res);
      expect(res.send).toHaveBeenCalled();
    });

    it('doğru ?token query param ile metrics döner', async () => {
      const res = mockResponse({}, { token: SECRET });
      await controller.getMetrics(res);
      expect(res.send).toHaveBeenCalled();
    });

    it('yanlış token ile ForbiddenException fırlatır', async () => {
      const res = mockResponse({ authorization: 'Bearer wrong-token' });
      await expect(controller.getMetrics(res)).rejects.toThrow(ForbiddenException);
    });

    it('token yokken ForbiddenException fırlatır', async () => {
      const res = mockResponse();
      await expect(controller.getMetrics(res)).rejects.toThrow(ForbiddenException);
    });
  });
});
