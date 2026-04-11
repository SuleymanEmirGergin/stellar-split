import { PiggyBank } from 'lucide-react';

interface Props {
  groupId: number | string;
  walletAddress: string;
}

export function SocialSavings({ groupId: _groupId, walletAddress: _walletAddress }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <PiggyBank size={40} className="opacity-20" />
      <p className="text-sm font-bold">Savings vaults coming soon</p>
      <p className="text-xs opacity-60">Pool XLM or USDC with your group for shared goals.</p>
    </div>
  );
}
