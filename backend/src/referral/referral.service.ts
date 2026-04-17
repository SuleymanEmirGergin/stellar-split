import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const REWARD_PER_REFERRAL = 5.0; // SPLT tokens per successful referral
const TIER_PRO = 3;
const TIER_INFLUENCER = 10;

export function getTier(count: number): 'Starter' | 'Pro' | 'Influencer' {
  if (count >= TIER_INFLUENCER) return 'Influencer';
  if (count >= TIER_PRO) return 'Pro';
  return 'Starter';
}

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get referral stats for the current user */
  async getMyReferral(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referrals: {
          select: { id: true, walletAddress: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const tier = getTier(user.referralCount);
    const totalEarnings = user.referralCount * REWARD_PER_REFERRAL;

    return {
      code: user.referralCode,
      referralCount: user.referralCount,
      totalEarnings,
      tier,
      history: user.referrals.map((r) => ({
        friend: r.walletAddress,
        joinedAt: r.createdAt.getTime(),
        reward: REWARD_PER_REFERRAL,
      })),
    };
  }

  /**
   * Claim a referral code — called when a new user registers with ?ref=CODE.
   * Idempotent: if the user already has a referrer, returns current state.
   */
  async claimReferral(userId: string, referralCode: string) {
    // Find the referrer
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, referralCount: true },
    });

    if (!referrer) throw new NotFoundException('Invalid referral code');
    if (referrer.id === userId) throw new ConflictException('Cannot use your own referral code');

    // Check if already referred
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });

    if (!me) throw new NotFoundException('User not found');
    if (me.referredById) throw new ConflictException('Already claimed a referral code');

    // Atomically update: set referredById on claimer, increment count on referrer
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { referredById: referrer.id },
      }),
      this.prisma.user.update({
        where: { id: referrer.id },
        data: { referralCount: { increment: 1 } },
      }),
    ]);

    return { success: true, referrerId: referrer.id };
  }
}
