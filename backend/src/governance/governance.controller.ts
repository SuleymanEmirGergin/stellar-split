import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GovernanceService } from './governance.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CastDisputeVoteDto } from './dto/cast-dispute-vote.dto';
import { ApiAuth, ApiGroupErrors, ApiConflictResponse, ApiNotFoundResponse, ApiForbiddenResponse } from '../common/swagger/decorators';

@Throttle({ default: { limit: 20, ttl: 60000 } })
@ApiTags('governance')
@UseGuards(JwtAuthGuard)
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  // ─── Proposals ──────────────────────────────────────────────────────────────

  @Get('proposals')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'List proposals for a group' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of proposals with vote counts' })
  findProposals(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.governanceService.findProposals(groupId, user.sub, cursor, limit);
  }

  @Post('proposals')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  createProposal(@CurrentUser() user: JwtPayload, @Body() dto: CreateProposalDto) {
    return this.governanceService.createProposal(user.sub, dto);
  }

  @Post('proposals/:id/vote')
  @ApiAuth()
  @ApiNotFoundResponse('Proposal')
  @ApiForbiddenResponse('Not a group member, or proposal is not active')
  @ApiConflictResponse('Already voted on this proposal')
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  @ApiResponse({ status: 201, description: 'Vote recorded; proposal status recalculated' })
  castVote(
    @CurrentUser() user: JwtPayload,
    @Param('id') proposalId: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.governanceService.castVote(proposalId, user.sub, dto);
  }

  // ─── Disputes ───────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'List disputes for a group' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of disputes' })
  findDisputes(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.governanceService.findDisputes(groupId, user.sub, cursor, limit);
  }

  @Post('disputes')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Initiate a dispute on an expense' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  createDispute(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.governanceService.createDispute(user.sub, dto);
  }

  @Post('disputes/:id/vote')
  @ApiAuth()
  @ApiNotFoundResponse('Dispute')
  @ApiForbiddenResponse('Not a group member, or dispute is not open')
  @ApiOperation({ summary: 'Cast a vote on a dispute (uphold or dismiss)' })
  @ApiResponse({ status: 201, description: 'Vote recorded; dispute status recalculated' })
  castDisputeVote(
    @Param('id') disputeId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CastDisputeVoteDto,
  ) {
    return this.governanceService.castDisputeVote(disputeId, user.sub, dto);
  }
}
