import { IsNumber, IsPositive, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContributeSavingsDto {
  @ApiProperty({ description: 'Amount to contribute' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Optional note' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
