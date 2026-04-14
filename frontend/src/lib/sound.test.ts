import { sounds } from './sound';

// ── AudioContext mock ─────────────────────────────────────────────────────────

function makeMockNode() {
  return {
    type: '' as OscillatorType,
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

const mockCtx = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
};

beforeAll(() => {
  vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCtx.state = 'running';
  const node = makeMockNode();
  mockCtx.createOscillator.mockReturnValue(node);
  mockCtx.createGain.mockReturnValue(node);
  // Reset the internal ctx so it creates a fresh one each describe block
  (sounds as unknown as { ctx: null }).ctx = null;
});

describe('SoundEngine', () => {
  it('playTick() creates oscillator and gain, starts and stops', async () => {
    await sounds.playTick();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
    const osc = mockCtx.createOscillator.mock.results[0].value;
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });

  it('playSuccess() plays 4 notes', async () => {
    await sounds.playSuccess();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('playError() creates oscillator and gain', async () => {
    await sounds.playError();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    const osc = mockCtx.createOscillator.mock.results[0].value;
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });

  it('playSwoosh() creates oscillator and gain', async () => {
    await sounds.playSwoosh();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('playCash() creates oscillator and gain', async () => {
    await sounds.playCash();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('playFire() creates oscillator and gain', async () => {
    await sounds.playFire();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('resumes suspended context before playing', async () => {
    mockCtx.state = 'suspended';
    await sounds.playTick();
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it('reuses the same AudioContext across calls', async () => {
    await sounds.playTick();
    await sounds.playTick();
    // AudioContext constructor called only once (ctx is cached)
    expect((AudioContext as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(1);
  });
});
