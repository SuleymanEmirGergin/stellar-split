import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecoveryRequestDto {
  @ApiProperty({ description: 'ID of the group to initiate recovery in' })
  @IsString()
  @IsNotEmpty()
  groupId: string;
}
