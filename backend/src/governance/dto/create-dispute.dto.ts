import { IsString, IsNotEmpty, IsNumber, IsPositive, MaxLength } from 'class-validator';
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
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description: string;
}
