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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List groups for authenticated user' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.groupsService.findAll(user.sub, cursor, limit, search);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group (creator only)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete group (creator only)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.remove(id, user.sub);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join group via invite code' })
  join(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('inviteCode') inviteCode?: string,
  ) {
    return this.groupsService.join(id, user.sub, inviteCode);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a group' })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.leave(id, user.sub);
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Get per-member balances for a group' })
  getBalances(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getBalances(id, user.sub);
  }

  @Get(':id/invite')
  @ApiOperation({ summary: 'Get group invite link' })
  getInvite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.groupsService.getInviteLink(id, user.sub);
  }
}
