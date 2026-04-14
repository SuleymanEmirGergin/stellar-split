import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(overrides: { url?: string; status?: jest.Mock; json?: jest.Mock } = {}): ArgumentsHost {
  const json = overrides.json ?? jest.fn();
  const status = overrides.status ?? jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
      getRequest: () => ({ url: overrides.url ?? '/test' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('returns correct status and body for HttpException', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = makeHost({ status, json });

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, data: null }),
    );
  });

  it('returns 500 for non-HttpException errors', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = makeHost({ status, json });

    filter.catch(new Error('Unexpected'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('unwraps object message from HttpException', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = makeHost({ status, json });

    filter.catch(new HttpException({ message: 'Validation failed', field: 'email' }, 422), host);

    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0][0];
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.field).toBe('email');
  });

  it('includes path and timestamp in response', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = makeHost({ url: '/groups/1', status, json });

    filter.catch(new HttpException('Bad request', 400), host);

    const body = json.mock.calls[0][0];
    expect(body.error.path).toBe('/groups/1');
    expect(body.error.timestamp).toBeDefined();
  });
});
