import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';

@Injectable()
export class GuardiansService {
  private readonly logger = new Logger(GuardiansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByGroup(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    return this.prisma.guardian.findMany({
      where: { groupId },
      include: {
        guardian: { select: { id: true, walletAddress: true } },
      },
    });
  }

  async create(userId: string, dto: CreateGuardianDto) {
    await this.assertMember(dto.groupId, userId);

    const guardianUser = await this.prisma.user.findUnique({
      where: { walletAddress: dto.guardianAddress },
    });
    if (!guardianUser) throw new NotFoundException('Guardian user not found — they must have a StellarSplit account');

    const existing = await this.prisma.guardian.findUnique({
      where: { userId_guardianUserId_groupId: { userId, guardianUserId: guardianUser.id, groupId: dto.groupId } },
    });
    if (existing) throw new ConflictException('This guardian is already added');

    const guardian = await this.prisma.guardian.create({
      data: {
        userId,
        groupId: dto.groupId,
        guardianUserId: guardianUser.id,
      },
    });

    this.logger.log({ guardianId: guardian.id, userId, guardianUserId: guardianUser.id }, 'Guardian added');
    return guardian;
  }

  async remove(guardianId: string, userId: string) {
    const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian) throw new NotFoundException('Guardian not found');
    if (guardian.userId !== userId) throw new ForbiddenException('You can only remove your own guardians');
    await this.prisma.guardian.delete({ where: { id: guardianId } });
    this.logger.log({ guardianId, removedBy: userId }, 'Guardian removed');
  }

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }
}
