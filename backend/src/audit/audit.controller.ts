import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { AuditService } from './audit.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

class AuditQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Transform(({ value }) => parseInt(value, 10)) limit?: number;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() action?: string;
}

@Throttle({ default: { limit: 60, ttl: 60000 } })
@ApiTags('audit')
@ApiBearerAuth()
@Controller('groups/:groupId/audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /groups/:groupId/audit
   * Returns the append-only activity feed for a group.
   * Only group members can access it.
   */
  @Get()
  @ApiOperation({ summary: 'Get group activity / audit log' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity: group | expense | settlement | member' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action: expense.created | settlement.confirmed | ...' })
  async getGroupAudit(
    @Param('groupId') groupId: string,
    @Query() query: AuditQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.sub } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');

    return this.auditService.findByGroup(groupId, {
      cursor: query.cursor,
      limit: query.limit,
      entityType: query.entityType,
      action: query.action,
    });
  }
}
