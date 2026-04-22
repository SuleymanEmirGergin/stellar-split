import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SponsorService } from './sponsor.service';
import { FeeBumpRequestDto, FeeBumpResponseDto } from './dto/fee-bump.dto';

@ApiTags('sponsor')
@Controller('sponsor')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  /**
   * POST /sponsor/fee-bump
   *
   * Wrap a user-signed Stellar transaction in a fee-bump envelope so the
   * Birik sponsor account pays the network fee. Public endpoint — no JWT
   * required — because signing a fee-bump proves nothing about the caller's
   * identity. The inner XDR already carries the user's signature; the worst
   * a bad actor can do is drain sponsor XLM, which is why:
   *
   *   - `@Throttle` caps callers to 10/min per IP
   *   - production should add a captcha + per-wallet daily spend cap
   *   - the sponsor account's balance stays minimal (see service docblock)
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('fee-bump')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Wrap a signed inner transaction in a sponsor-paid fee-bump envelope',
    description:
      'Accepts a user-signed Stellar transaction XDR and returns a fee-bump ' +
      'transaction signed by the Birik sponsor account. The frontend submits ' +
      'the returned fee-bump XDR to Horizon — the sponsor pays the network fee.',
  })
  @ApiResponse({ status: 200, description: 'Signed fee-bump XDR', type: FeeBumpResponseDto })
  @ApiResponse({ status: 400, description: 'innerXdr is invalid or already a fee-bump' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (10/min per IP)' })
  @ApiResponse({ status: 503, description: 'Fee sponsorship not configured on this deployment' })
  feeBump(@Body() dto: FeeBumpRequestDto): FeeBumpResponseDto {
    return this.sponsorService.wrapAsFeeBump(dto.innerXdr);
  }
}
