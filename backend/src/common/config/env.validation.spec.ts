import { validateEnv } from './env.validation';

const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'development',
  PORT: '3001',
  FRONTEND_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/stellarsplit',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'super-secret-key-that-is-at-least-32-characters-long',
  JWT_ACCESS_TTL: '900',
  JWT_REFRESH_TTL: '604800',
  STELLAR_NETWORK: 'testnet',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  SOROBAN_CONTRACT_ID: 'CABC123VALID',
};

describe('validateEnv()', () => {
  it('accepts a fully valid configuration', () => {
    expect(() => validateEnv(VALID_ENV)).not.toThrow();
  });

  it('returns parsed values', () => {
    const result = validateEnv(VALID_ENV);
    expect(result.PORT).toBe(3001);
    expect(result.JWT_ACCESS_TTL).toBe(900);
    expect(result.NODE_ENV).toBe('development');
  });

  it('throws when DATABASE_URL is missing', () => {
    const env = { ...VALID_ENV };
    delete env['DATABASE_URL'];
    expect(() => validateEnv(env)).toThrow('DATABASE_URL');
  });

  it('throws when REDIS_URL is missing', () => {
    const env = { ...VALID_ENV };
    delete env['REDIS_URL'];
    expect(() => validateEnv(env)).toThrow('REDIS_URL');
  });

  it('throws when JWT_SECRET is missing', () => {
    const env = { ...VALID_ENV };
    delete env['JWT_SECRET'];
    expect(() => validateEnv(env)).toThrow('JWT_SECRET');
  });

  it('throws when JWT_SECRET is too short (< 32 chars)', () => {
    const env = { ...VALID_ENV, JWT_SECRET: 'short' };
    expect(() => validateEnv(env)).toThrow('JWT_SECRET');
  });

  it('throws when SOROBAN_CONTRACT_ID is the placeholder value', () => {
    const env = { ...VALID_ENV, NODE_ENV: 'production', SOROBAN_CONTRACT_ID: 'CHANGE_ME_CONTRACT_ADDRESS' };
    expect(() => validateEnv(env)).toThrow('SOROBAN_CONTRACT_ID');
  });

  it('throws when STELLAR_NETWORK is invalid', () => {
    const env = { ...VALID_ENV, STELLAR_NETWORK: 'unknownnet' };
    expect(() => validateEnv(env)).toThrow('STELLAR_NETWORK');
  });

  it('uses default PORT 3001 when PORT is not set', () => {
    const env = { ...VALID_ENV };
    delete env['PORT'];
    const result = validateEnv(env);
    expect(result.PORT).toBe(3001);
  });

  it('throws when SOROBAN_RPC_URL is missing', () => {
    const env = { ...VALID_ENV };
    delete env['SOROBAN_RPC_URL'];
    expect(() => validateEnv(env)).toThrow('SOROBAN_RPC_URL');
  });

  it('collects all errors in a single throw', () => {
    const env: Record<string, string> = {
      NODE_ENV: 'development',
      STELLAR_NETWORK: 'testnet',
    };
    expect(() => validateEnv(env)).toThrow(/DATABASE_URL.*|REDIS_URL.*|JWT_SECRET.*/s);
  });
});
