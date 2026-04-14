import { forwardToWebhookProxy } from './webhook-proxy';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('forwardToWebhookProxy', () => {
  const message = { content: 'hello' };

  it('returns true for non-slack/discord URL after delay', async () => {
    const promise = forwardToWebhookProxy('https://example.com/hook', message);
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);
  });

  it('does NOT call fetch for non-slack/discord URL', async () => {
    const promise = forwardToWebhookProxy('https://example.com/hook', message);
    await vi.runAllTimersAsync();
    await promise;
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch and returns true for Discord webhook URL', async () => {
    const url = 'https://discord.com/api/webhooks/123/abc';
    const promise = forwardToWebhookProxy(url, message);
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
      mode: 'no-cors',
    }));
  });

  it('calls fetch and returns true for Slack webhook URL', async () => {
    const url = 'https://hooks.slack.com/services/T00/B00/abc';
    const promise = forwardToWebhookProxy(url, message);
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
    }));
  });

  it('returns false when fetch throws for Discord URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const url = 'https://discord.com/api/webhooks/x/y';
    const promise = forwardToWebhookProxy(url, message);
    await vi.runAllTimersAsync();
    expect(await promise).toBe(false);
  });
});
