import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request body for POST /sponsor/fee-bump.
 *
 * The caller submits the *inner* transaction XDR — their own Stellar
 * transaction, already signed by the user's wallet but NOT yet broadcast.
 * The sponsor wraps this in a fee-bump envelope and pays the fee on the
 * user's behalf.
 */
export class FeeBumpRequestDto {
  @ApiProperty({
    description:
      'Base64-encoded XDR of the inner transaction, signed by the user. ' +
      'The backend will wrap this in a fee-bump envelope so the sponsor ' +
      'account pays the network fee.',
    example: 'AAAAAgAAAAB...==',
  })
  @IsString()
  @IsNotEmpty()
  innerXdr!: string;
}

/**
 * Response body for POST /sponsor/fee-bump.
 *
 * The frontend submits `feeBumpXdr` to Horizon (or a Horizon-proxying
 * endpoint). From the user's perspective the transaction is gasless —
 * the sponsor account's XLM balance pays for it.
 */
export class FeeBumpResponseDto {
  @ApiProperty({
    description:
      'Base64-encoded XDR of the signed fee-bump transaction. Submit this ' +
      'to Horizon — both the inner signature (user) and outer signature ' +
      '(sponsor) are already attached.',
  })
  feeBumpXdr!: string;

  @ApiProperty({
    description: 'Public key (G...) of the sponsor account that paid the fee.',
    example: 'GABCDEF...',
  })
  sponsorAccount!: string;

  @ApiProperty({
    description: 'Stellar network the fee-bump was built for.',
    enum: ['testnet', 'public'],
  })
  network!: 'testnet' | 'public';
}
