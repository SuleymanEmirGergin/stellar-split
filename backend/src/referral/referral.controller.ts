import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';

class ClaimReferralDto {
  @IsString()
  code: string;
}

@Throttle({ default: { limit: 20, ttl: 60000 } })
@ApiTags('referral')
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /referral/me — referral code + stats for current user */
  @Get('me')
  @ApiOperation({ summary: 'Get referral code and stats for current user' })
  @ApiResponse({ status: 200, description: 'Referral data returned' })
  getMyReferral(@CurrentUser() user: JwtPayload) {
    return this.referralService.getMyReferral(user.sub);
  }

  /** POST /referral/claim — claim a referral code */
  @Post('claim')
  @ApiOperation({ summary: 'Claim a referral code (link current user to referrer)' })
  @ApiBody({ schema: { properties: { code: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Referral successfully claimed' })
  @ApiResponse({ status: 404, description: 'Invalid referral code' })
  @ApiResponse({ status: 409, description: 'Already claimed or self-referral' })
  claimReferral(@CurrentUser() user: JwtPayload, @Body() dto: ClaimReferralDto) {
    return this.referralService.claimReferral(user.sub, dto.code);
  }
}
