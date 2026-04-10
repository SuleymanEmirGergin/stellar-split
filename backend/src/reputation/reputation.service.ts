import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMyReputation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { orderBy: { awardedAt: 'desc' } },
        settlements: {
          where: { status: 'CONFIRMED' },
          select: { id: true, amount: true, timestamp: true },
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      userId: user.id,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      badges: user.badges,
      settlementHistory: user.settlements,
    };
  }

  async getBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async updateScore(userId: string, delta: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore: { increment: delta } },
    });
    this.logger.log({ userId, delta, newScore: user.reputationScore }, 'Reputation score updated');
    // Check and award badges
    await this.checkBadges(userId, user.reputationScore);
    return user;
  }

  private async checkBadges(userId: string, score: number) {
    const milestones = [
      { score: 10, badge: 'FIRST_SETTLEMENT' },
      { score: 50, badge: 'TRUSTED_MEMBER' },
      { score: 100, badge: 'STELLAR_PAYER' },
    ];
    for (const m of milestones) {
      if (score >= m.score) {
        await this.prisma.userBadge.upsert({
          where: { userId_badge: { userId, badge: m.badge } },
          create: { userId, badge: m.badge },
          update: {},
        });
      }
    }
  }
}
