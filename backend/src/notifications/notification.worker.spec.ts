jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => {},
  WorkerHost: class { async process(_job: unknown): Promise<void> {} },
  InjectQueue: () => () => {},
}));

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

import { NotificationWorker } from './notification.worker';
import { ConfigService } from '@nestjs/config';

function makeJob(data: object) {
  return { data } as any;
}

function makeConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('NotificationWorker', () => {
  afterEach(() => jest.clearAllMocks());

  describe('process()', () => {
    it('skips Discord call when DISCORD_WEBHOOK_URL is not set', async () => {
      const worker = new NotificationWorker(makeConfig());
      const job = makeJob({ notificationId: 'n1', userId: 'u1', type: 'expense:added', payload: {} });

      await expect(worker.process(job)).resolves.toBeUndefined();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('sends Discord webhook when URL is configured', async () => {
      const worker = new NotificationWorker(
        makeConfig({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test', DISCORD_WEBHOOK_SECRET: 'secret' }),
      );
      const job = makeJob({ notificationId: 'n1', userId: 'u1', type: 'expense:added', payload: { amount: 50 } });
      mockedAxios.post.mockResolvedValue({ status: 204 });

      await expect(worker.process(job)).resolves.toBeUndefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Signature': expect.any(String) }) }),
      );
    });

    it('rethrows Discord error so BullMQ retries the job', async () => {
      const worker = new NotificationWorker(
        makeConfig({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' }),
      );
      const job = makeJob({ notificationId: 'n1', userId: 'u1', type: 'test', payload: {} });
      mockedAxios.post.mockRejectedValue(new Error('timeout'));

      await expect(worker.process(job)).rejects.toThrow('timeout');
    });
  });
});
