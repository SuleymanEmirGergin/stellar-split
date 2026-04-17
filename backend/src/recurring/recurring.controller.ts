import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';

@Throttle({ default: { limit: 20, ttl: 60000 } })
@ApiTags('recurring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get('groups/:groupId/recurring')
  @ApiOperation({ summary: 'List recurring templates for a group' })
  findByGroup(@Param('groupId') groupId: string, @CurrentUser() user: JwtPayload) {
    return this.recurringService.findByGroup(groupId, user.sub);
  }

  @Post('recurring')
  @ApiOperation({ summary: 'Create a recurring expense template' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(user.sub, dto);
  }

  @Patch('recurring/:id')
  @ApiOperation({ summary: 'Update a recurring template' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Partial<CreateRecurringDto>,
  ) {
    return this.recurringService.update(id, user.sub, dto);
  }

  @Delete('recurring/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recurring template' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recurringService.remove(id, user.sub);
  }
}
