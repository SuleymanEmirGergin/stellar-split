import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { SavingsService } from './savings.service';
import { CreateSavingsPoolDto } from './dto/create-savings-pool.dto';
import { ContributeSavingsDto } from './dto/contribute-savings.dto';

@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiTags('savings')
@UseGuards(JwtAuthGuard)
@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  /** POST /savings — create a new pool */
  @Post()
  @ApiOperation({ summary: 'Create a savings pool for a group' })
  @ApiResponse({ status: 201, description: 'Pool created' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSavingsPoolDto) {
    return this.savingsService.createPool(user.sub, dto);
  }

  /** GET /savings?groupId=... — list all pools for a group */
  @Get()
  @ApiOperation({ summary: 'List savings pools for a group' })
  @ApiQuery({ name: 'groupId', required: true })
  findByGroup(@CurrentUser() user: JwtPayload, @Query('groupId') groupId: string) {
    return this.savingsService.findByGroup(groupId, user.sub);
  }

  /** GET /savings/:id — single pool */
  @Get(':id')
  @ApiOperation({ summary: 'Get a savings pool by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.savingsService.findOne(id, user.sub);
  }

  /** POST /savings/:id/contribute — add funds */
  @Post(':id/contribute')
  @ApiOperation({ summary: 'Contribute to a savings pool' })
  @ApiResponse({ status: 201, description: 'Contribution recorded; returns goalReached flag' })
  contribute(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ContributeSavingsDto,
  ) {
    return this.savingsService.contribute(id, user.sub, dto);
  }

  /** DELETE /savings/:id — cancel a pool */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a savings pool (creator only)' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.savingsService.cancelPool(id, user.sub);
  }
}
