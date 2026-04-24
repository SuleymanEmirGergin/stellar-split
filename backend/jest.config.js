/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
          strictNullChecks: true,
          noImplicitAny: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
  },
  // Transform ESM-only packages that ship `export` syntax in their dist bundles
  // (@aws-sdk/* went ESM-first after v3.600; Jest must transpile them through
  // ts-jest instead of treating them as pre-built CJS).
  transformIgnorePatterns: [
    'node_modules/(?!(@aws-sdk|@smithy|uuid)/)',
  ],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/index.ts',
    '!main.ts',
    '!**/*.d.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  setupFiles: ['reflect-metadata'],
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,

  // ─── Global coverage thresholds ────────────────────────────────────────────
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
};

module.exports = config;
