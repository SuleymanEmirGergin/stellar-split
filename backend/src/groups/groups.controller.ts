import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { ApiAuth, ApiGroupErrors, ApiNotFoundResponse, ApiForbiddenResponse, ApiConflictResponse } from '../common/swagger/decorators';

@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiTags('groups')
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiAuth()
  @ApiOperation({ summary: 'List groups for authenticated user' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of groups the user belongs to' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.groupsService.findAll(user.sub, cursor, limit, search);
  }

  @Post()
  @ApiAuth()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.sub, dto);
  }

  @Get(':id')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Get group detail' })
  @ApiResponse({ status: 200, description: 'Group detail with members and balances' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiGroupErrors()
  @ApiForbiddenResponse('Only the group creator can update it')
  @ApiOperation({ summary: 'Update group (creator only)' })
  @ApiResponse({ status: 200, description: 'Updated group' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiGroupErrors()
  @ApiForbiddenResponse('Only the group creator can delete it')
  @ApiOperation({ summary: 'Delete group (creator only)' })
  @ApiResponse({ status: 204, description: 'Group deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.remove(id, user.sub);
  }

  @Post(':id/join')
  @ApiAuth()
  @ApiNotFoundResponse('Group')
  @ApiConflictResponse('Already a member of this group')
  @ApiOperation({ summary: 'Join group via invite code' })
  @ApiResponse({ status: 201, description: 'Joined group' })
  join(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('inviteCode') inviteCode?: string,
  ) {
    return this.groupsService.join(id, user.sub, inviteCode);
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Leave a group' })
  @ApiResponse({ status: 200, description: 'Left group successfully' })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.leave(id, user.sub);
  }

  @Get(':id/balances')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Get per-member balances for a group' })
  @ApiResponse({ status: 200, description: 'Map of walletAddress → net balance in XLM' })
  getBalances(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getBalances(id, user.sub);
  }

  @Get(':id/settlement-plan')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Get optimized settlement plan (minimum transfers to clear all debts)' })
  @ApiResponse({ status: 200, description: 'List of { from, to, amount } transfers' })
  getSettlementPlan(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getSettlementPlan(id, user.sub);
  }

  @Get(':id/invite')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Get group invite link' })
  @ApiResponse({ status: 200, description: 'Invite link with one-time code' })
  getInvite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getInviteLink(id, user.sub);
  }

  @Get(':id/analytics')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Get spending analytics for a group' })
  @ApiResponse({
    status: 200,
    description: 'Category breakdown, per-member spending, and daily timeline',
  })
  getAnalytics(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getAnalytics(id, user.sub);
  }

  @Patch(':id/transfer-ownership')
  @ApiGroupErrors()
  @ApiForbiddenResponse('Only the group creator can transfer ownership')
  @ApiOperation({ summary: 'Transfer group ownership to another member (creator only)' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  transferOwnership(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.groupsService.transferOwnership(id, user.sub, dto);
  }
}
