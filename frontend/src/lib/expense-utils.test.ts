import { describe, it, expect } from 'vitest';
import { getExpensePayer, getExpenseCreatedAt, getExpenseStatus } from './expense-utils';

describe('getExpensePayer', () => {
  it('reads payer from Soroban shape', () => {
    expect(getExpensePayer({ payer: 'GABC' })).toBe('GABC');
  });

  it('reads walletAddress from backend shape', () => {
    expect(getExpensePayer({ paidBy: { walletAddress: 'GXYZ' } })).toBe('GXYZ');
  });

  it('backend paidBy wins when both fields are present', () => {
    expect(getExpensePayer({ payer: 'GABC', paidBy: { walletAddress: 'GXYZ' } })).toBe('GXYZ');
  });

  it('returns empty string when neither field is present', () => {
    expect(getExpensePayer({})).toBe('');
  });

  it('returns empty string when paidBy exists but walletAddress is missing', () => {
    expect(getExpensePayer({ paidBy: {} })).toBe('');
  });
});

describe('getExpenseCreatedAt', () => {
  it('returns createdAt when present', () => {
    expect(getExpenseCreatedAt({ createdAt: '2024-01-01T00:00:00Z' })).toBe('2024-01-01T00:00:00Z');
  });

  it('returns undefined when createdAt is missing', () => {
    expect(getExpenseCreatedAt({})).toBeUndefined();
  });

  it('returns undefined when only unrelated fields are present', () => {
    expect(getExpenseCreatedAt({ amount: 100 })).toBeUndefined();
  });
});

describe('getExpenseStatus', () => {
  it('returns status when present', () => {
    expect(getExpenseStatus({ status: 'ACTIVE' })).toBe('ACTIVE');
  });

  it('returns undefined when status is missing', () => {
    expect(getExpenseStatus({})).toBeUndefined();
  });
});
