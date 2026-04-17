import { IsString, IsNumber, IsPositive, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentRequestCurrency {
  XLM = 'XLM',
  USDC = 'USDC',
}

export class CreatePaymentRequestDto {
  @ApiProperty({ description: 'Group ID this request belongs to' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  toUserId: string;

  @ApiProperty({ description: 'Amount in XLM decimal' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ enum: PaymentRequestCurrency, default: PaymentRequestCurrency.XLM })
  @IsOptional()
  @IsEnum(PaymentRequestCurrency)
  currency?: PaymentRequestCurrency;

  @ApiPropertyOptional({ description: 'Optional note for the recipient' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'ISO due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
