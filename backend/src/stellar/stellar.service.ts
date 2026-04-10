import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly horizonUrl: string;
  private readonly network: string;

  constructor(private readonly config: ConfigService) {
    this.horizonUrl = config.get<string>('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org');
    this.network = config.get<string>('STELLAR_NETWORK', 'testnet');
  }

  /**
   * Fetch transaction details from Stellar Horizon API.
   * Used by the StellarTxMonitor worker to confirm settlement status.
   */
  async getTransaction(txHash: string): Promise<{ successful: boolean; createdAt: string } | null> {
    try {
      const response = await axios.get(`${this.horizonUrl}/transactions/${txHash}`, { timeout: 30000 });
      const data = response.data as { successful: boolean; created_at: string };
      return { successful: data.successful, createdAt: data.created_at };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      this.logger.warn({ txHash, err: String(err) }, 'Horizon API error');
      throw err;
    }
  }

  /**
   * Get account balances from Horizon.
   */
  async getAccountBalances(walletAddress: string) {
    const server = new StellarSdk.Horizon.Server(this.horizonUrl);
    const account = await server.loadAccount(walletAddress);
    return account.balances;
  }

  /**
   * Get current XLM/USD price from CoinGecko.
   * Falls back gracefully if API is unavailable.
   */
  async getXlmPrice(): Promise<number | null> {
    const apiKey = this.config.get<string>('COINGECKO_API_KEY');
    try {
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
      const headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
      const response = await axios.get(url, { headers, timeout: 5000 });
      const data = response.data as { stellar: { usd: number } };
      return data.stellar?.usd ?? null;
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'CoinGecko price fetch failed');
      return null;
    }
  }

  /**
   * Verify a Stellar keypair signature (Ed25519).
   * Used by auth service — exposed here for adapter consistency.
   */
  verifySignature(publicKey: string, message: string, signatureBase64: string): boolean {
    try {
      const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
      const msgBuf = Buffer.from(message, 'utf-8');
      const sigBuf = Buffer.from(signatureBase64, 'base64');
      return keypair.verify(msgBuf, sigBuf);
    } catch {
      return false;
    }
  }
}
