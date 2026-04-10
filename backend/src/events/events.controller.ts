import {
  Controller,
  Param,
  Res,
  ForbiddenException,
  MessageEvent,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { EventsService } from './events.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('events')
@ApiBearerAuth()
@Controller()
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /groups/:groupId/events
   *
   * Server-Sent Events stream for a group.
   * Client receives real-time events (expense:added, settlement:confirmed, etc.)
   * without polling. Automatically reconnects via EventSource API.
   *
   * Event types:
   *   expense:added         — new expense created in the group
   *   expense:cancelled     — expense marked cancelled
   *   settlement:confirmed  — Stellar tx confirmed, group settled
   *   settlement:failed     — Stellar tx failed
   *   member:joined         — new member joined the group
   *   member:left           — member left the group
   *   recurring:triggered   — recurring expense auto-created
   *   heartbeat             — keep-alive ping every 25 s
   */
  @Sse('groups/:groupId/events')
  @ApiOperation({ summary: 'SSE stream for live group events' })
  async streamGroupEvents(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent>> {
    // Verify membership before opening the stream
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.sub } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');

    // Disable buffering on proxies (Nginx, Railway)
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache');

    return this.eventsService.streamForGroup(groupId);
  }
}
