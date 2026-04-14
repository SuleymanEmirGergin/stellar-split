import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GovernanceService } from './governance.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@ApiTags('governance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  // ─── Proposals ──────────────────────────────────────────────────────────────

  @Get('proposals')
  @ApiOperation({ summary: 'List proposals for a group' })
  @ApiQuery({ name: 'groupId', required: true })
  findProposals(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.governanceService.findProposals(groupId, user.sub);
  }

  @Post('proposals')
  @ApiOperation({ summary: 'Create a new proposal' })
  createProposal(@CurrentUser() user: JwtPayload, @Body() dto: CreateProposalDto) {
    return this.governanceService.createProposal(user.sub, dto);
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  castVote(
    @CurrentUser() user: JwtPayload,
    @Param('id') proposalId: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.governanceService.castVote(proposalId, user.sub, dto);
  }

  // ─── Disputes ───────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'List disputes for a group' })
  @ApiQuery({ name: 'groupId', required: true })
  findDisputes(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.governanceService.findDisputes(groupId, user.sub);
  }

  @Post('disputes')
  @ApiOperation({ summary: 'Initiate a dispute on an expense' })
  createDispute(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.governanceService.createDispute(user.sub, dto);
  }
}
