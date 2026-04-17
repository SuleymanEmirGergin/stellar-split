import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementStatusDto } from './dto/update-settlement-status.dto';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@ApiTags('settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get('groups/:groupId/settlements')
  @ApiOperation({ summary: 'List settlements for a group' })
  findByGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.settlementsService.findByGroup(groupId, user.sub, cursor, limit);
  }

  @Post('groups/:groupId/settlements')
  @ApiOperation({ summary: 'Record a Stellar settlement transaction' })
  create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSettlementDto,
  ) {
    dto.groupId = groupId;
    return this.settlementsService.create(user.sub, dto);
  }

  @Patch('settlements/:id/status')
  @ApiOperation({ summary: 'Update settlement status (CONFIRMED or FAILED)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSettlementStatusDto,
  ) {
    return this.settlementsService.updateStatus(id, user.sub, dto);
  }
}
