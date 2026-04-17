import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateRecoveryRequestDto } from './dto/create-recovery-request.dto';

@Throttle({ default: { limit: 15, ttl: 60000 } })
@ApiTags('guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get('groups/:groupId/guardians')
  @ApiOperation({ summary: 'List guardians for a group' })
  findByGroup(@Param('groupId') groupId: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.findByGroup(groupId, user.sub);
  }

  @Post('guardians')
  @ApiOperation({ summary: 'Add a social recovery guardian' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuardianDto) {
    return this.guardiansService.create(user.sub, dto);
  }

  @Delete('guardians/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a guardian' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.remove(id, user.sub);
  }

  @Post('guardians/recovery-request')
  @ApiOperation({ summary: 'Initiate a social recovery request' })
  createRecoveryRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecoveryRequestDto) {
    return this.guardiansService.createRecoveryRequest(user.sub, dto);
  }

  @Get('guardians/recovery-requests')
  @ApiOperation({ summary: 'List pending recovery requests where I am a guardian' })
  findPendingRecoveryRequests(@CurrentUser() user: JwtPayload) {
    return this.guardiansService.findPendingRecoveryRequests(user.sub);
  }

  @Post('guardians/recovery-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a recovery request (guardian only)' })
  approveRecoveryRequest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.approveRecoveryRequest(id, user.sub);
  }

  @Post('guardians/recovery-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a recovery request (guardian only)' })
  rejectRecoveryRequest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guardiansService.rejectRecoveryRequest(id, user.sub);
  }
}
