import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSocialGoals, createSocialGoal, contributeToGoal, releaseVaultFunds } from './vault_shared';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('getSocialGoals', () => {
  it('returns empty array when no goals exist', () => {
    expect(getSocialGoals(1)).toEqual([]);
  });

  it('returns only goals for the specified groupId', () => {
    createSocialGoal({ groupId: 1, title: 'Trip', targetAmount: 500, creator: 'Alice', category: 'trip' });
    createSocialGoal({ groupId: 2, title: 'Dinner', targetAmount: 100, creator: 'Bob', category: 'dinner' });
    expect(getSocialGoals(1)).toHaveLength(1);
    expect(getSocialGoals(2)).toHaveLength(1);
  });
});

describe('createSocialGoal', () => {
  it('creates a goal with id, currentAmount=0, status=active', () => {
    const goal = createSocialGoal({ groupId: 1, title: 'Gift', targetAmount: 200, creator: 'Alice', category: 'gift' });
    expect(goal.id).toBeDefined();
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe('active');
  });

  it('persists the goal in localStorage', () => {
    createSocialGoal({ groupId: 1, title: 'Other', targetAmount: 50, creator: 'Bob', category: 'other' });
    expect(getSocialGoals(1)).toHaveLength(1);
  });
});

describe('contributeToGoal', () => {
  it('increases currentAmount by the contributed amount', () => {
    const goal = createSocialGoal({ groupId: 1, title: 'Trip', targetAmount: 500, creator: 'A', category: 'trip' });
    const updated = contributeToGoal(goal.id, 100);
    expect(updated?.currentAmount).toBe(100);
  });

  it('sets status to achieved when currentAmount reaches target', () => {
    const goal = createSocialGoal({ groupId: 1, title: 'Trip', targetAmount: 100, creator: 'A', category: 'trip' });
    const updated = contributeToGoal(goal.id, 100);
    expect(updated?.status).toBe('achieved');
  });

  it('returns null for a non-existent goalId', () => {
    expect(contributeToGoal('nonexistent', 50)).toBeNull();
  });
});

describe('releaseVaultFunds', () => {
  it('returns false for a non-existent goalId', async () => {
    expect(await releaseVaultFunds('nonexistent')).toBe(false);
  });

  it('returns false for an active (not achieved) goal', async () => {
    const goal = createSocialGoal({ groupId: 1, title: 'Trip', targetAmount: 500, creator: 'A', category: 'trip' });
    expect(await releaseVaultFunds(goal.id)).toBe(false);
  });

  it('returns true and sets status to released for an achieved goal', async () => {
    const goal = createSocialGoal({ groupId: 1, title: 'Trip', targetAmount: 50, creator: 'A', category: 'trip' });
    contributeToGoal(goal.id, 50);
    const promise = releaseVaultFunds(goal.id);
    await vi.runAllTimersAsync();
    const released = await promise;
    expect(released).toBe(true);
    const goals = getSocialGoals(1);
    expect(goals[0].status).toBe('released');
  });
});
