import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsPositive,
  MinLength,
  MaxLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SplitType {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
  PERCENTAGE = 'PERCENTAGE',
}

export enum ExpenseCurrency {
  XLM = 'XLM',
  USDC = 'USDC',
}

export class SplitDetailDto {
  @ApiProperty({ description: 'Stellar wallet address of member' })
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/)
  walletAddress: string;

  @ApiProperty({ description: 'Amount this member owes' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Percentage for percentage split' })
  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  @ApiProperty({ description: 'Amount in chosen currency' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: ExpenseCurrency })
  @IsEnum(ExpenseCurrency)
  currency: ExpenseCurrency;

  @ApiProperty({ description: 'Wallet address of the person who paid' })
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'paidBy must be a valid Stellar public key' })
  paidBy: string;

  @ApiProperty({ enum: SplitType })
  @IsEnum(SplitType)
  splitType: SplitType;

  @ApiProperty({ description: 'Group ID this expense belongs to' })
  @IsString()
  groupId: string;

  @ApiPropertyOptional({ description: 'Custom split details (required for CUSTOM and PERCENTAGE splits)', type: [SplitDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitDetailDto)
  splits?: SplitDetailDto[];

  @ApiPropertyOptional({ description: 'URL of uploaded receipt image' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
