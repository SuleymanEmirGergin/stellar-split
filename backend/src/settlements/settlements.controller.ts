import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

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

  @Post('settlements')
  @ApiOperation({ summary: 'Record a Stellar settlement transaction' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(user.sub, dto);
  }
}
