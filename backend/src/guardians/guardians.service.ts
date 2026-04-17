import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateRecoveryRequestDto } from './dto/create-recovery-request.dto';

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

  async createRecoveryRequest(userId: string, dto: CreateRecoveryRequestDto) {
    await this.assertMember(dto.groupId, userId);
    const request = await this.prisma.recoveryRequest.create({
      data: { userId, groupId: dto.groupId },
    });
    this.logger.log({ requestId: request.id, userId, groupId: dto.groupId }, 'Recovery request created');
    return request;
  }

  async findPendingRecoveryRequests(userId: string) {
    // Return requests where the user is a guardian for the affected user
    const guardianships = await this.prisma.guardian.findMany({
      where: { guardianUserId: userId },
      select: { userId: true },
    });
    const protectedUserIds = guardianships.map(g => g.userId);

    return this.prisma.recoveryRequest.findMany({
      where: { userId: { in: protectedUserIds }, status: 'PENDING' },
      include: { user: { select: { id: true, walletAddress: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async approveRecoveryRequest(requestId: string, guardianUserId: string) {
    const request = await this.prisma.recoveryRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Recovery request not found');

    // Verify user is a guardian for the requester
    const guardianship = await this.prisma.guardian.findFirst({
      where: { userId: request.userId, guardianUserId },
    });
    if (!guardianship) throw new ForbiddenException('You are not a guardian for this user');

    const updated = await this.prisma.recoveryRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });
    this.logger.log({ requestId, approvedBy: guardianUserId }, 'Recovery request approved');
    return updated;
  }

  async rejectRecoveryRequest(requestId: string, guardianUserId: string) {
    const request = await this.prisma.recoveryRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Recovery request not found');

    const guardianship = await this.prisma.guardian.findFirst({
      where: { userId: request.userId, guardianUserId },
    });
    if (!guardianship) throw new ForbiddenException('You are not a guardian for this user');

    const updated = await this.prisma.recoveryRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
    this.logger.log({ requestId, rejectedBy: guardianUserId }, 'Recovery request rejected');
    return updated;
  }

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }
}
