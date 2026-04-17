import { IsString, IsEnum, IsOptional, IsArray, Matches, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupCurrency {
  XLM = 'XLM',
  USDC = 'USDC',
}

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: GroupCurrency, default: GroupCurrency.XLM })
  @IsEnum(GroupCurrency)
  currency: GroupCurrency = GroupCurrency.XLM;

  @ApiPropertyOptional({ description: 'Initial member wallet addresses' })
  @IsOptional()
  @IsArray()
  @Matches(/^G[A-Z2-7]{55}$/, { each: true, message: 'Each member must be a valid Stellar public key' })
  members?: string[];
}
