import { IsString, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyWalletDto {
  @ApiProperty({ description: 'Stellar public key (G...)' })
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'walletAddress must be a valid Stellar public key' })
  walletAddress: string;

  @ApiProperty({ description: 'Base64-encoded Ed25519 signature from Freighter' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Challenge nonce from GET /auth/challenge' })
  @IsString()
  @IsNotEmpty()
  nonce: string;
}
