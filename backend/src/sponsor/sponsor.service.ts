import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * ─── Stellar Fee Sponsorship (a.k.a. "gasless" UX) ────────────────────────────
 *
 * WHAT IT IS
 *   Stellar supports "fee-bump" transactions (CAP-15): a second, outer
 *   transaction that references an inner transaction and pays its fee from a
 *   different account. The inner transaction's signatures are preserved; only
 *   the outer envelope is re-signed by the sponsor. Horizon treats the fee-bump
 *   as the thing that lands on-chain — the sponsor's XLM balance takes the hit,
 *   not the user's.
 *
 *   For Birik users, this means they never need to hold XLM just to settle
 *   an expense. They sign with Freighter as usual; our sponsor account pays.
 *
 * FUNDING THE SPONSOR
 *   testnet: fund once via friendbot:
 *     curl "https://friendbot.stellar.org?addr=$SPONSOR_PUBLIC"
 *   mainnet: real liquidity. Keep balance modest (~50-100 XLM is plenty for
 *   thousands of tx — each fee-bump costs ~0.00001 XLM). Top up via a
 *   scheduled job pulling from cold storage, not a big lump-sum deposit.
 *
 * SECURITY (READ THIS)
 *   SPONSOR_SECRET_KEY is a HOT WALLET KEY. It lives in the backend env and
 *   signs transactions autonomously. Mitigations:
 *     - Keep balance minimal — treasury, not savings.
 *     - Monitor balance & error rate via Sentry + a Prom counter; alert if
 *       sponsor signs > N tx/min (abuse) or balance drops below threshold.
 *     - Rate-limit per IP (throttle decorator on controller) + captcha in
 *       production; otherwise sponsor funds are trivially drainable.
 *     - Consider a daily XLM spend cap enforced in this service — future work.
 *
 * See: https://developers.stellar.org/docs/learn/encyclopedia/transactions/fee-bump
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class SponsorService {
  private readonly logger = new Logger(SponsorService.name);

  /** Base fee cap in stroops (1 XLM). Stellar consumes only what's needed; rest is refunded. */
  private static readonly FEE_BUMP_BASE_FEE = '10000000';

  constructor(private readonly config: ConfigService) {}

  /**
   * Resolve the sponsor keypair from env. Throws 503 if not configured —
   * sponsorship is an optional feature; the rest of the API runs without it.
   */
  private getSponsorKeypair(): StellarSdk.Keypair {
    const secret = this.config.get<string>('SPONSOR_SECRET_KEY');
    if (!secret || secret.trim() === '') {
      throw new ServiceUnavailableException(
        'Fee sponsorship is not configured on this deployment',
      );
    }
    try {
      return StellarSdk.Keypair.fromSecret(secret.trim());
    } catch {
      // Invalid secret in env — treat as not configured; don't leak details.
      this.logger.error('SPONSOR_SECRET_KEY is set but invalid — cannot derive keypair');
      throw new ServiceUnavailableException(
        'Fee sponsorship is not configured on this deployment',
      );
    }
  }

  /**
   * Resolve the Stellar network passphrase + short name from env.
   * Maps `STELLAR_NETWORK` (testnet | public | mainnet) to the SDK's
   * passphrase constants. Defaults to testnet.
   */
  private getNetwork(): { passphrase: string; short: 'testnet' | 'public' } {
    const raw = (this.config.get<string>('STELLAR_NETWORK') ?? 'testnet')
      .trim()
      .toLowerCase();
    // Birik historically used 'mainnet' as a synonym for 'public' — accept both.
    if (raw === 'public' || raw === 'mainnet') {
      return { passphrase: StellarSdk.Networks.PUBLIC, short: 'public' };
    }
    return { passphrase: StellarSdk.Networks.TESTNET, short: 'testnet' };
  }

  /**
   * Wrap a user-signed inner transaction in a fee-bump envelope signed by the
   * sponsor account. The caller submits the returned XDR to Horizon.
   *
   * Throws:
   *   - 503 if SPONSOR_SECRET_KEY is not configured (degraded mode)
   *   - 400 if innerXdr is not a valid Stellar transaction
   */
  wrapAsFeeBump(innerXdr: string): {
    feeBumpXdr: string;
    sponsorAccount: string;
    network: 'testnet' | 'public';
  } {
    const sponsorKeypair = this.getSponsorKeypair();
    const { passphrase, short } = this.getNetwork();

    // Parse inner tx. Stellar SDK's fromXDR returns Transaction | FeeBumpTransaction;
    // a fee-bump cannot itself be fee-bumped, so reject that case up front.
    let innerTx: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction;
    try {
      innerTx = StellarSdk.TransactionBuilder.fromXDR(innerXdr, passphrase) as
        | StellarSdk.Transaction
        | StellarSdk.FeeBumpTransaction;
    } catch (err: unknown) {
      this.logger.debug({ err: String(err) }, 'Rejected invalid inner XDR');
      throw new BadRequestException(
        'innerXdr is not a valid base64-encoded Stellar transaction envelope',
      );
    }

    if (innerTx instanceof StellarSdk.FeeBumpTransaction) {
      throw new BadRequestException(
        'innerXdr is already a fee-bump transaction; cannot double-wrap',
      );
    }

    // Build + sign the fee-bump envelope.
    let feeBump: StellarSdk.FeeBumpTransaction;
    try {
      feeBump = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
        sponsorKeypair,
        SponsorService.FEE_BUMP_BASE_FEE,
        innerTx,
        passphrase,
      );
      feeBump.sign(sponsorKeypair);
    } catch (err: unknown) {
      this.logger.warn({ err: String(err) }, 'Failed to build fee-bump transaction');
      throw new BadRequestException(
        'Failed to build fee-bump for the provided inner transaction',
      );
    }

    this.logger.log(
      {
        sponsor: sponsorKeypair.publicKey(),
        network: short,
        innerSource: innerTx.source,
      },
      'Signed fee-bump envelope',
    );

    return {
      feeBumpXdr: feeBump.toXDR(),
      sponsorAccount: sponsorKeypair.publicKey(),
      network: short,
    };
  }
}
