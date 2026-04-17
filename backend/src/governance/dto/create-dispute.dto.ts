import { IsString, IsNotEmpty, IsNumber, IsPositive, MaxLength, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expenseId: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  @Max(1_000_000)
  amount: number;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  @IsString()
  @MaxLength(2000)
  description: string;
}
