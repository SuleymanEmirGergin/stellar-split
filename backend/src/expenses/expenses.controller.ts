import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('groups/:groupId/expenses')
  @ApiOperation({ summary: 'List expenses for a group' })
  findByGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.findByGroup(groupId, user.sub, cursor, limit);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Add an expense to a group' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.sub, dto);
  }

  @Patch('expenses/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an expense' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.expensesService.cancel(id, user.sub);
  }
}
