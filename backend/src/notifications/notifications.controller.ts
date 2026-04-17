import { Controller, Get, Post, Delete, Patch, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for Web Push' })
  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.notificationsService.getVapidPublicKey() };
  }

  @Post('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Subscribe to Web Push notifications' })
  subscribePush(@CurrentUser() user: JwtPayload, @Body() dto: PushSubscriptionDto): Promise<void> {
    return this.notificationsService.subscribePush(user.sub, dto);
  }

  @Delete('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe from Web Push notifications' })
  unsubscribePush(@CurrentUser() user: JwtPayload, @Body() body: { endpoint: string }): Promise<void> {
    return this.notificationsService.unsubscribePush(user.sub, body.endpoint);
  }

  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.findAll(user.sub, cursor, limit);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markRead(id, user.sub);
  }
}
