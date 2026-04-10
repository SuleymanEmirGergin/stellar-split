import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsPositive,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateRecurringDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @ApiProperty({ description: 'ISO 8601 datetime for next due' })
  @IsDateString()
  nextDue: string;

  @ApiPropertyOptional({ description: 'Wallet addresses to split among; defaults to all group members' })
  @IsOptional()
  @IsArray()
  @Matches(/^G[A-Z2-7]{55}$/, { each: true })
  members?: string[];
}
