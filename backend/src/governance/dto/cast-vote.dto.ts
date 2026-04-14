import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CastVoteDto {
  @ApiProperty({ enum: ['yes', 'no'] })
  @IsIn(['yes', 'no'])
  option: 'yes' | 'no';
}
