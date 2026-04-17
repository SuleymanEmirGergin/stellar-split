/**
 * Environment variable validation that runs at startup.
 * Throws a descriptive error if required variables are missing or invalid.
 * Uses only Node built-ins — no extra dependencies.
 */

interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_TTL: number;
  JWT_REFRESH_TTL: number;
  STELLAR_NETWORK: string;
  SOROBAN_RPC_URL: string;
  SOROBAN_CONTRACT_ID: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const errors: string[] = [];

  function required(key: string): string {
    const val = config[key];
    if (!val || String(val).trim() === '') {
      errors.push(`  ${key} — required but not set`);
      return '';
    }
    return String(val).trim();
  }

  function requiredUrl(key: string): string {
    const val = required(key);
    if (val && !val.startsWith('http') && !val.startsWith('postgres') && !val.startsWith('redis')) {
      errors.push(`  ${key} — must be a URL (got: "${val}")`);
    }
    return val;
  }

  function requiredInt(key: string, min?: number, max?: number): number {
    const raw = config[key];
    if (!raw && raw !== 0) {
      errors.push(`  ${key} — required but not set`);
      return 0;
    }
    const n = parseInt(String(raw), 10);
    if (isNaN(n)) {
      errors.push(`  ${key} — must be an integer (got: "${raw}")`);
      return 0;
    }
    if (min !== undefined && n < min) errors.push(`  ${key} — must be >= ${min} (got: ${n})`);
    if (max !== undefined && n > max) errors.push(`  ${key} — must be <= ${max} (got: ${n})`);
    return n;
  }

  const nodeEnv = String(config['NODE_ENV'] ?? 'development');
  const port = config['PORT'] ? requiredInt('PORT', 1, 65535) : 3001;
  const frontendUrl = requiredUrl('FRONTEND_URL');
  const databaseUrl = requiredUrl('DATABASE_URL');
  const redisUrl = requiredUrl('REDIS_URL');

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret) {
    const minLen = nodeEnv === 'production' ? 64 : 32;
    if (jwtSecret.length < minLen) {
      errors.push(`  JWT_SECRET — must be at least ${minLen} characters (got ${jwtSecret.length})`);
    }
  }

  const jwtAccessTtl = config['JWT_ACCESS_TTL'] ? requiredInt('JWT_ACCESS_TTL', 60) : 900;
  const jwtRefreshTtl = config['JWT_REFRESH_TTL'] ? requiredInt('JWT_REFRESH_TTL', 3600) : 604800;

  const stellarNetwork = String(config['STELLAR_NETWORK'] ?? 'testnet');
  if (!['testnet', 'mainnet', 'futurenet'].includes(stellarNetwork)) {
    errors.push(`  STELLAR_NETWORK — must be testnet, mainnet, or futurenet (got: "${stellarNetwork}")`);
  }

  const sorobanRpcUrl = requiredUrl('SOROBAN_RPC_URL');

  // SOROBAN_CONTRACT_ID: hard required in production; skipped in dev so local
  // development works before a contract is deployed to testnet.
  const rawContractId = String(config['SOROBAN_CONTRACT_ID'] ?? '').trim();
  let contractId = rawContractId;
  if (nodeEnv === 'production') {
    if (!rawContractId || rawContractId === 'CHANGE_ME_CONTRACT_ADDRESS') {
      errors.push('  SOROBAN_CONTRACT_ID — required in production');
    }
  } else if (rawContractId === 'CHANGE_ME_CONTRACT_ADDRESS') {
    contractId = ''; // treat placeholder as unset in dev
  }

  // VAPID keys — required in production for Web Push; optional in dev
  const vapidPublicKey = String(config['VAPID_PUBLIC_KEY'] ?? '').trim();
  const vapidPrivateKey = String(config['VAPID_PRIVATE_KEY'] ?? '').trim();
  const vapidSubject = String(config['VAPID_SUBJECT'] ?? '').trim();
  if (nodeEnv === 'production') {
    if (!vapidPublicKey) errors.push('  VAPID_PUBLIC_KEY — required in production');
    if (!vapidPrivateKey) errors.push('  VAPID_PRIVATE_KEY — required in production');
    if (!vapidSubject) errors.push('  VAPID_SUBJECT — required in production (e.g. mailto:admin@example.com)');
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\n[StellarSplit] Environment validation failed — fix these variables before starting:\n\n` +
      errors.join('\n') +
      `\n\nSee .env.example for reference.\n`,
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    FRONTEND_URL: frontendUrl,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_TTL: jwtAccessTtl,
    JWT_REFRESH_TTL: jwtRefreshTtl,
    STELLAR_NETWORK: stellarNetwork,
    SOROBAN_RPC_URL: sorobanRpcUrl,
    SOROBAN_CONTRACT_ID: contractId,
    VAPID_PUBLIC_KEY: vapidPublicKey,
    VAPID_PRIVATE_KEY: vapidPrivateKey,
    VAPID_SUBJECT: vapidSubject,
  };
}
