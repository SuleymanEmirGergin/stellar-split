import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuardianDto {
  @ApiProperty({ description: 'Wallet address of the guardian' })
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'guardianAddress must be a valid Stellar public key' })
  guardianAddress: string;

  @ApiProperty({ description: 'Group ID for which this guardian is added' })
  @IsString()
  groupId: string;
}
