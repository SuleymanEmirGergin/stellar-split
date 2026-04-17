import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('runWiroTask', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when VITE_WIRO_API_KEY is not set', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', '');
    const { runWiroTask } = await import('./wiro');
    await expect(runWiroTask('google/gemini-3-flash', new FormData())).rejects.toThrow('VITE_WIRO_API_KEY is not set');
    vi.unstubAllEnvs();
  });

  it('throws when fetch response is not ok', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    } as any);
    const { runWiroTask } = await import('./wiro');
    await expect(runWiroTask('google/gemini-3-flash', new FormData())).rejects.toThrow('Wiro Run failed (401)');
    vi.unstubAllEnvs();
  });

  it('throws when response JSON indicates failure (result: false)', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: false, errors: ['some error'] }),
    } as any);
    const { runWiroTask } = await import('./wiro');
    await expect(runWiroTask('google/gemini-3-flash', new FormData())).rejects.toThrow('Wiro Run error');
    vi.unstubAllEnvs();
  });

  it('returns socketaccesstoken on success', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: true, socketaccesstoken: 'token-abc' }),
    } as any);
    const { runWiroTask } = await import('./wiro');
    const token = await runWiroTask('google/gemini-3-flash', new FormData());
    expect(token).toBe('token-abc');
    vi.unstubAllEnvs();
  });
});

describe('pollWiroTask', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('throws timeout error when max attempts exceeded', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ tasklist: [{ status: 'task_running' }] }),
    } as any);
    const { pollWiroTask } = await import('./wiro');
    const promise = pollWiroTask('task-token');
    // Advance timers past MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS (30 * 2000 = 60000ms)
    await vi.advanceTimersByTimeAsync(65000);
    await expect(promise).rejects.toThrow('Wiro task timeout');
  });

  it('returns debugoutput when task ends and no output URL is present', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tasklist: [{ status: 'task_end', debugoutput: 'AI result text' }],
      }),
    } as any);
    const { pollWiroTask } = await import('./wiro');
    const result = await pollWiroTask('task-token');
    expect(result).toBe('AI result text');
  });

  it('fetches and returns output URL content when outputs are present', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    const taskFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          tasklist: [{ status: 'task_postprocess_end', outputs: [{ url: 'https://output.example/result.json', contenttype: 'application/json' }] }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('{"answer": 42}'),
      });
    global.fetch = taskFetch as any;
    const { pollWiroTask } = await import('./wiro');
    const result = await pollWiroTask('task-token');
    expect(result).toBe('{"answer": 42}');
  });

  it('calls onStatusUpdate callback with current status', async () => {
    vi.stubEnv('VITE_WIRO_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tasklist: [{ status: 'task_end', debugoutput: 'done' }],
      }),
    } as any);
    const { pollWiroTask } = await import('./wiro');
    const onStatusUpdate = vi.fn();
    await pollWiroTask('task-token', onStatusUpdate);
    expect(onStatusUpdate).toHaveBeenCalledWith('task_end');
  });
});
