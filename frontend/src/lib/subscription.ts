export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: number;
  members: string[];
  owner: string;
  status: 'active' | 'paused';
}

const SUB_KEY = 'stellarsplit_subscriptions';

export const getSubscriptions = (groupId: number): Subscription[] => {
  const saved = localStorage.getItem(`${SUB_KEY}_${groupId}`);
  return saved ? JSON.parse(saved) : [];
};

export const createSubscription = (groupId: number, sub: Omit<Subscription, 'id' | 'nextRun' | 'status'>): Subscription => {
  const subs = getSubscriptions(groupId);
  
  const now = Date.now();
  let nextRun = now;
  if (sub.frequency === 'daily') nextRun += 86400000;
  else if (sub.frequency === 'weekly') nextRun += 604800000;
  else if (sub.frequency === 'monthly') nextRun += 2592000000;

  const newSub: Subscription = {
    ...sub,
    id: Math.random().toString(36).substring(2, 9),
    nextRun,
    status: 'active'
  };

  localStorage.setItem(`${SUB_KEY}_${groupId}`, JSON.stringify([...subs, newSub]));
  return newSub;
};

export const deleteSubscription = (groupId: number, subId: string) => {
  const subs = getSubscriptions(groupId);
  localStorage.setItem(`${SUB_KEY}_${groupId}`, JSON.stringify(subs.filter(s => s.id !== subId)));
};

export const toggleSubscription = (groupId: number, subId: string) => {
  const subs = getSubscriptions(groupId);
  const updated = subs.map(s => s.id === subId ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s);
  localStorage.setItem(`${SUB_KEY}_${groupId}`, JSON.stringify(updated));
};
