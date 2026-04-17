import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettlementStatusDto {
  @ApiProperty({ enum: ['CONFIRMED', 'FAILED'] })
  @IsEnum(['CONFIRMED', 'FAILED'])
  status: 'CONFIRMED' | 'FAILED';

  @ApiPropertyOptional({ description: 'Stellar transaction hash (for CONFIRMED)' })
  @IsOptional()
  @IsString()
  txHash?: string;
}
