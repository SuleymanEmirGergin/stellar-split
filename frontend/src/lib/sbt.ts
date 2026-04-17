import { type Badge } from './badges';

/**
 * Soulbound Token (SBT) Metadata Structure
 * These tokens are non-transferable and represent irreversible achievements.
 */
export interface SBTMetadata {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  issuer: string;
  mintedAt: number;
  transactionHash?: string;
}

/**
 * Mints an SBT for a specific badge (Mock for hackathon)
 */
export async function mintSBT(badge: Badge, walletAddress: string): Promise<SBTMetadata> {
  // Simulate delay for Soroban contract invocation
  console.log(`Minting SBT for ${walletAddress}...`);
  await new Promise(r => setTimeout(r, 1500));
  
  const metadata: SBTMetadata = {
    tokenId: `sbt_${badge.id}_${Math.floor(Math.random() * 10000)}`,
    name: `StellarSplit SBT: ${badge.name}`,
    description: `Permanent reputation token awarded for: ${badge.description}`,
    image: badge.icon, // In production, this would be an IPFS hash
    external_url: 'https://stellarsplit.app',
    attributes: [
      { trait_type: 'Achievement', value: badge.name },
      { trait_type: 'Identity', value: 'Verified User' },
      { trait_type: 'Issuer', value: 'StellarSplit DAO' }
    ],
    issuer: 'GA...DAO', // DAO contract/public key
    mintedAt: Date.now(),
    transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
  };

  // Pre-fetch/persist the minted state
  const minted = getMintedSBTs();
  minted.push(metadata);
  localStorage.setItem('stellarsplit_minted_sbts', JSON.stringify(minted));

  return metadata;
}

/**
 * Retrieves all minted SBTs for the current user
 */
export function getMintedSBTs(): SBTMetadata[] {
  const saved = localStorage.getItem('stellarsplit_minted_sbts');
  return saved ? JSON.parse(saved) : [];
}

/**
 * Checks if a specific badge has already been minted as an SBT
 */
export function isBadgeMinted(badgeId: string): boolean {
  const minted = getMintedSBTs();
  return minted.some(sbt => sbt.tokenId.includes(badgeId));
}
/**
 * Checks behavioral data and auto-mints badges if criteria met
 */
export async function checkAndMintAchievements(walletAddress: string, data: {
  settlementTimeMinutes?: number;
  savingsCount?: number;
  referralCount?: number;
}) {
  const BADGES = (await import('./badges')).BADGES;
  
  if (data.settlementTimeMinutes && data.settlementTimeMinutes < 60 && !isBadgeMinted('flash')) {
    const flash = BADGES.find(b => b.id === 'flash');
    if (flash) await mintSBT(flash, walletAddress);
  }

  if (data.savingsCount && data.savingsCount >= 3 && !isBadgeMinted('vault-master')) {
    const vm = BADGES.find(b => b.id === 'vault-master');
    if (vm) await mintSBT(vm, walletAddress);
  }

  if (data.referralCount && data.referralCount >= 5 && !isBadgeMinted('builder')) {
    const builder = BADGES.find(b => b.id === 'builder');
    if (builder) await mintSBT(builder, walletAddress);
  }
}
