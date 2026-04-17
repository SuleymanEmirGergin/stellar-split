import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PaymentRequestsService } from './payment-requests.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';

@Throttle({ default: { limit: 30, ttl: 60000 } })
@ApiTags('payment-requests')
@UseGuards(JwtAuthGuard)
@Controller('payment-requests')
export class PaymentRequestsController {
  constructor(private readonly paymentRequestsService: PaymentRequestsService) {}

  /** POST /payment-requests — create a new request */
  @Post()
  @ApiOperation({ summary: 'Send a payment request to another group member' })
  @ApiResponse({ status: 201, description: 'Payment request created' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentRequestDto) {
    return this.paymentRequestsService.create(user.sub, dto);
  }

  /** GET /payment-requests/received — pending requests sent TO the current user */
  @Get('received')
  @ApiOperation({ summary: 'List pending payment requests received by the current user' })
  @ApiResponse({ status: 200, description: 'Array of pending payment requests' })
  findReceived(@CurrentUser() user: JwtPayload) {
    return this.paymentRequestsService.findReceived(user.sub);
  }

  /** GET /payment-requests?groupId=... — all requests for a group */
  @Get()
  @ApiOperation({ summary: 'List all payment requests for a group' })
  @ApiQuery({ name: 'groupId', required: true, description: 'Group UUID' })
  @ApiResponse({ status: 200, description: 'Array of payment requests' })
  findByGroup(
    @CurrentUser() user: JwtPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.paymentRequestsService.findByGroup(groupId, user.sub);
  }

  /** PATCH /payment-requests/:id/paid — recipient marks as paid */
  @Patch(':id/paid')
  @ApiOperation({ summary: 'Mark a payment request as paid (recipient only)' })
  @ApiResponse({ status: 200, description: 'Payment request marked as PAID' })
  markPaid(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentRequestsService.markPaid(id, user.sub);
  }

  /** PATCH /payment-requests/:id/cancel — sender cancels */
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a payment request (sender only)' })
  @ApiResponse({ status: 200, description: 'Payment request cancelled' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentRequestsService.cancel(id, user.sub);
  }
}
