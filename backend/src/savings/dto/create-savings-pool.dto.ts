import { IsString, IsNumber, IsPositive, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class CreateSavingsPoolDto {
  @ApiProperty({ description: 'Group ID' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Pool title / goal name' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Goal amount to reach' })
  @IsNumber()
  @IsPositive()
  goalAmount: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.XLM })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Optional deadline ISO date' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
