import { Controller, Get, Delete, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GDPR Article 20 — Data portability.
   * Returns all personal data associated with the authenticated user as JSON.
   */
  @Get('me/export')
  @ApiOperation({ summary: 'Export all personal data (GDPR Art. 20)' })
  @ApiResponse({ status: 200, description: 'JSON export of all user data' })
  async exportData(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const data = await this.usersService.exportData(user.sub);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stellarsplit-export-${user.sub}.json"`,
    );
    res.status(HttpStatus.OK).json(data);
  }

  /**
   * GDPR Article 17 — Right to erasure.
   * Permanently deletes the authenticated user and all associated data.
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account and all personal data (GDPR Art. 17)' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async deleteAccount(@CurrentUser() user: JwtPayload) {
    await this.usersService.deleteAccount(user.sub);
  }
}
