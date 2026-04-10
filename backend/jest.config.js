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
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = config;
