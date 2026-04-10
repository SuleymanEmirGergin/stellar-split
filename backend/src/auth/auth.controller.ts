import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('challenge')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Request a SIWS challenge nonce' })
  @ApiResponse({ status: 200, description: 'Returns a nonce to sign' })
  async challenge(@Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    return this.authService.generateChallenge(ip);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verify SIWS signature and issue JWT' })
  @ApiResponse({ status: 200, description: 'Returns access token; sets refresh cookie' })
  async verify(
    @Body() dto: VerifyWalletDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifySiws(dto);
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800') * 1000,
      path: '/auth',
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using HttpOnly cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    const result = await this.authService.refreshTokens(token);
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800') * 1000,
      path: '/auth',
    });
    return { accessToken: result.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: JwtPayload,
  ) {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    await this.authService.logout(user.sub, token);
    res.clearCookie('refresh_token', { path: '/auth' });
    return { message: 'Logged out' };
  }
}
