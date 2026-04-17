import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ReputationService } from './reputation.service';

@Throttle({ default: { limit: 60, ttl: 60000 } })
@ApiTags('reputation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user reputation + badges + settlement history' })
  getMyReputation(@CurrentUser() user: JwtPayload) {
    return this.reputationService.getMyReputation(user.sub);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get current user badges' })
  getBadges(@CurrentUser() user: JwtPayload) {
    return this.reputationService.getBadges(user.sub);
  }
}
