import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CastDisputeVoteDto {
  @ApiProperty({ enum: ['uphold', 'dismiss'], description: 'Vote option for the dispute' })
  @IsIn(['uphold', 'dismiss'], { message: 'option must be "uphold" or "dismiss"' })
  option: 'uphold' | 'dismiss';
}
