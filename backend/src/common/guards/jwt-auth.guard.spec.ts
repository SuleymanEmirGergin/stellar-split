import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Mock AuthGuard so super.canActivate() is controllable
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate(_ctx: unknown) {
        return true;
      }
    },
}));

function makeContext(isPublic: boolean, handlerFn = jest.fn(), classFn = jest.fn()): ExecutionContext {
  return {
    getHandler: () => handlerFn,
    getClass: () => classFn,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('returns true immediately for routes marked @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = makeContext(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('delegates to AuthGuard for non-public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = makeContext(false);
    // MockAuthGuard always returns true
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
