import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const mockContext = {} as any;

  it('wraps truthy data in success envelope', async () => {
    const next = { handle: () => of({ id: 1 }) };
    const result = await firstValueFrom(interceptor.intercept(mockContext, next));
    expect(result).toEqual({ success: true, data: { id: 1 }, error: null });
  });

  it('wraps null data correctly', async () => {
    const next = { handle: () => of(null) };
    const result = await firstValueFrom(interceptor.intercept(mockContext, next));
    expect(result).toEqual({ success: true, data: null, error: null });
  });

  it('wraps undefined data as null', async () => {
    const next = { handle: () => of(undefined) };
    const result = await firstValueFrom(interceptor.intercept(mockContext, next));
    expect(result).toEqual({ success: true, data: null, error: null });
  });
});
