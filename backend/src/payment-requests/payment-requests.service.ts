import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';

export enum PaymentRequestStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Injectable()
export class PaymentRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new payment request */
  async create(fromUserId: string, dto: CreatePaymentRequestDto) {
    // Verify the requesting user is a member of the group
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId: fromUserId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Ensure the recipient is also in the group
    const recipientMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId: dto.toUserId } },
    });
    if (!recipientMembership) {
      throw new ForbiddenException('Recipient is not a member of this group');
    }

    return this.prisma.$queryRawUnsafe<unknown>(
      `INSERT INTO "PaymentRequest" (id, "fromUserId", "toUserId", "groupId", amount, currency, note, "dueDate", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'PENDING', now(), now())
       RETURNING *`,
      fromUserId,
      dto.toUserId,
      dto.groupId,
      dto.amount,
      dto.currency ?? 'XLM',
      dto.note ?? null,
      dto.dueDate ? new Date(dto.dueDate) : null,
    );
  }

  /** List all payment requests for a group (sent + received) */
  async findByGroup(groupId: string, userId: string) {
    // Verify membership
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a group member');

    return this.prisma.$queryRawUnsafe<unknown[]>(
      `SELECT pr.*,
              fu."walletAddress" AS "fromWallet",
              tu."walletAddress" AS "toWallet"
       FROM "PaymentRequest" pr
       JOIN "User" fu ON fu.id = pr."fromUserId"
       JOIN "User" tu ON tu.id = pr."toUserId"
       WHERE pr."groupId" = $1
       ORDER BY pr."createdAt" DESC`,
      groupId,
    );
  }

  /** List payment requests received by the current user */
  async findReceived(userId: string) {
    return this.prisma.$queryRawUnsafe<unknown[]>(
      `SELECT pr.*,
              fu."walletAddress" AS "fromWallet",
              g.name AS "groupName"
       FROM "PaymentRequest" pr
       JOIN "User" fu ON fu.id = pr."fromUserId"
       JOIN "Group" g ON g.id = pr."groupId"
       WHERE pr."toUserId" = $1 AND pr.status = 'PENDING'
       ORDER BY pr."dueDate" ASC NULLS LAST, pr."createdAt" DESC`,
      userId,
    );
  }

  /** Mark a payment request as paid */
  async markPaid(id: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ toUserId: string }[]>(
      `SELECT "toUserId" FROM "PaymentRequest" WHERE id = $1`,
      id,
    );
    if (!rows.length) throw new NotFoundException('Payment request not found');
    if (rows[0].toUserId !== userId) throw new ForbiddenException('Only the recipient can mark as paid');

    return this.prisma.$queryRawUnsafe<unknown>(
      `UPDATE "PaymentRequest" SET status = 'PAID', "updatedAt" = now() WHERE id = $1 RETURNING *`,
      id,
    );
  }

  /** Cancel a payment request (only the sender can cancel) */
  async cancel(id: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ fromUserId: string }[]>(
      `SELECT "fromUserId" FROM "PaymentRequest" WHERE id = $1`,
      id,
    );
    if (!rows.length) throw new NotFoundException('Payment request not found');
    if (rows[0].fromUserId !== userId) throw new ForbiddenException('Only the sender can cancel');

    return this.prisma.$queryRawUnsafe<unknown>(
      `UPDATE "PaymentRequest" SET status = 'CANCELLED', "updatedAt" = now() WHERE id = $1 RETURNING *`,
      id,
    );
  }

  /** Expire overdue PENDING requests (called by a cron/worker) */
  async expireOverdue() {
    return this.prisma.$queryRawUnsafe<unknown>(
      `UPDATE "PaymentRequest"
       SET status = 'EXPIRED', "updatedAt" = now()
       WHERE status = 'PENDING' AND "dueDate" IS NOT NULL AND "dueDate" < now()`,
    );
  }
}
