import { IsString, IsNotEmpty, IsInt, Min, Max, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ default: 51 })
  @IsInt()
  @Min(1)
  @Max(100)
  threshold: number = 51;

  @ApiProperty({ description: 'ISO 8601 date string — when voting ends' })
  @IsDateString()
  endsAt: string;
}
