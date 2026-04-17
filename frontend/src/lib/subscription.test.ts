import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSubscriptions,
  createSubscription,
  deleteSubscription,
  toggleSubscription,
} from './subscription';

const FIXED_NOW = new Date('2024-01-01T00:00:00.000Z').getTime();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

const baseData = {
  name: 'X',
  amount: 10,
  members: [],
  owner: 'A',
} as const;

describe('createSubscription', () => {
  it('daily frequency → nextRun = Date.now() + 86400000', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    expect(sub.nextRun).toBe(FIXED_NOW + 86400000);
  });

  it('weekly frequency → nextRun = Date.now() + 604800000', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'weekly' });
    expect(sub.nextRun).toBe(FIXED_NOW + 604800000);
  });

  it('monthly frequency → nextRun = Date.now() + 2592000000', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'monthly' });
    expect(sub.nextRun).toBe(FIXED_NOW + 2592000000);
  });

  it('created subscription has status="active"', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    expect(sub.status).toBe('active');
  });
});

describe('getSubscriptions', () => {
  it('returns the subscription that was just created', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    const list = getSubscriptions(1);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(sub.id);
  });
});

describe('deleteSubscription', () => {
  it('after delete, getSubscriptions returns empty array', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    deleteSubscription(1, sub.id);
    expect(getSubscriptions(1)).toHaveLength(0);
  });
});

describe('toggleSubscription', () => {
  it('active subscription becomes "paused" after one toggle', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    toggleSubscription(1, sub.id);
    expect(getSubscriptions(1)[0].status).toBe('paused');
  });

  it('paused subscription returns to "active" after second toggle', () => {
    const sub = createSubscription(1, { ...baseData, frequency: 'daily' });
    toggleSubscription(1, sub.id);
    toggleSubscription(1, sub.id);
    expect(getSubscriptions(1)[0].status).toBe('active');
  });
});
