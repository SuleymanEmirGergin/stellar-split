import { PrismaExceptionFilter } from './prisma-exception.filter';
import { Prisma } from '@prisma/client';
import { ArgumentsHost } from '@nestjs/common';

function makeException(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('message', {
    code,
    clientVersion: '5.x',
  });
}

function makeHost(json: jest.Mock) {
  const response = { status: jest.fn().mockReturnThis(), json };
  const request = { url: '/test' };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
  });

  it('maps P2002 → 409 Conflict', () => {
    const json = jest.fn();
    const host = makeHost(json);

    filter.catch(makeException('P2002'), host);

    const body = json.mock.calls[0][0];
    expect(body.error.statusCode).toBe(409);
    expect(body.error.message).toBe('Resource already exists');
    expect(body.error.prismaCode).toBe('P2002');
    expect(body.success).toBe(false);
  });

  it('maps P2025 → 404 Not Found', () => {
    const json = jest.fn();
    filter.catch(makeException('P2025'), makeHost(json));

    const body = json.mock.calls[0][0];
    expect(body.error.statusCode).toBe(404);
    expect(body.error.message).toBe('Record not found');
  });

  it('maps P2003 → 400 Bad Request', () => {
    const json = jest.fn();
    filter.catch(makeException('P2003'), makeHost(json));

    const body = json.mock.calls[0][0];
    expect(body.error.statusCode).toBe(400);
    expect(body.error.message).toBe('Related record not found');
  });

  it('maps unknown Prisma code → 500', () => {
    const json = jest.fn();
    filter.catch(makeException('P9999'), makeHost(json));

    const body = json.mock.calls[0][0];
    expect(body.error.statusCode).toBe(500);
    expect(body.error.message).toBe('Database error');
  });
});
