export interface SocialGoal {
  id: string;
  groupId: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  creator: string;
  category: 'trip' | 'dinner' | 'gift' | 'other';
  status: 'active' | 'achieved' | 'released';
  deadline?: string;
}

const GOALS_KEY = 'stellarsplit_social_goals';

export const getSocialGoals = (groupId: number): SocialGoal[] => {
  const saved = localStorage.getItem(GOALS_KEY);
  if (!saved) return [];
  const allGoals: SocialGoal[] = JSON.parse(saved);
  return allGoals.filter(g => g.groupId === groupId);
};

export const createSocialGoal = (goal: Omit<SocialGoal, 'id' | 'currentAmount' | 'status'>): SocialGoal => {
  const allGoals = JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
  const newGoal: SocialGoal = {
    ...goal,
    id: Math.random().toString(36).substring(2, 9),
    currentAmount: 0,
    status: 'active'
  };
  
  localStorage.setItem(GOALS_KEY, JSON.stringify([...allGoals, newGoal]));
  return newGoal;
};

export const contributeToGoal = (goalId: string, amount: number): SocialGoal | null => {
  const allGoals: SocialGoal[] = JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
  const index = allGoals.findIndex(g => g.id === goalId);
  
  if (index === -1) return null;
  
  allGoals[index].currentAmount += amount;
  
  if (allGoals[index].currentAmount >= allGoals[index].targetAmount) {
    allGoals[index].status = 'achieved';
  }
  
  localStorage.setItem(GOALS_KEY, JSON.stringify(allGoals));
  return allGoals[index];
};

export const releaseVaultFunds = async (goalId: string): Promise<boolean> => {
  // Simulation: Multi-sig check with members
  // In a real app, this would require N-of-M signatures on a Soroban contract
  const allGoals: SocialGoal[] = JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
  const index = allGoals.findIndex(g => g.id === goalId);
  
  if (index === -1 || allGoals[index].status !== 'achieved') return false;
  
  // Mocking contract interaction
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  allGoals[index].status = 'released';
  localStorage.setItem(GOALS_KEY, JSON.stringify(allGoals));
  return true;
};
