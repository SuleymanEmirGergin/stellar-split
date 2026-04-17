import { IsString, IsNumber, IsPositive, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiPropertyOptional({ description: 'Group ID to settle (set from URL param)' })
  @IsOptional()
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Stellar transaction hash (64 hex chars)', pattern: '^[A-Fa-f0-9]{64}$' })
  @IsString()
  @Matches(/^[A-Fa-f0-9]{64}$/, { message: 'txHash must be a 64-char hex Stellar transaction hash' })
  txHash: string;

  @ApiProperty({ description: 'Settlement amount' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
