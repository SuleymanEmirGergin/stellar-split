import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GovernanceService } from './governance.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ApiAuth, ApiGroupErrors, ApiConflictResponse, ApiNotFoundResponse, ApiForbiddenResponse } from '../common/swagger/decorators';

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
  @ApiResponse({ status: 200, description: 'List of proposals with vote counts' })
  findProposals(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.governanceService.findProposals(groupId, user.sub);
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
  @ApiResponse({ status: 200, description: 'List of disputes' })
  findDisputes(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.governanceService.findDisputes(groupId, user.sub);
  }

  @Post('disputes')
  @ApiGroupErrors()
  @ApiOperation({ summary: 'Initiate a dispute on an expense' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  createDispute(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.governanceService.createDispute(user.sub, dto);
  }
}
