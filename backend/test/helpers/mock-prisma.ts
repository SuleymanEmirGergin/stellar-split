/**
 * Reusable PrismaService mock factory.
 * Returns an object with jest.fn() stubs for every model method used across the test suite.
 * Import `createMockPrisma` in any test file to get a fully typed mock.
 */

export type MockPrisma = ReturnType<typeof createMockPrisma>;

export function createMockPrisma() {
  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),

    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },

    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },

    group: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

    groupMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },

    expense: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

    expenseSplit: {
      findMany: jest.fn(),
      create: jest.fn(),
    },

    settlement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },

    recurringTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },

    userBadge: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },

    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as const;
}

/**
 * Reset all mocks on a MockPrisma instance.
 * Call this in `afterEach` when reusing the same instance across tests.
 */
export function resetMockPrisma(mock: MockPrisma): void {
  const resetModel = (model: Record<string, jest.Mock>) => {
    Object.values(model).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        fn.mockReset();
      }
    });
  };

  Object.values(mock).forEach((model) => {
    if (model && typeof model === 'object') {
      resetModel(model as Record<string, jest.Mock>);
    }
  });
}
