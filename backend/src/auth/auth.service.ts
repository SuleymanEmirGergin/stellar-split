import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { PrismaService } from '../common/prisma/prisma.service';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import * as StellarSdk from '@stellar/stellar-sdk';
import * as crypto from 'crypto';

const NONCE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async generateChallenge(ip: string) {
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + NONCE_TTL_SECONDS * 1000;
    const message = `Sign this message to authenticate with StellarSplit.\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`;
    // Store in Redis with TTL — safe for multi-instance deployments
    await this.redis.set(`siws:nonce:${nonce}`, message, 'EX', NONCE_TTL_SECONDS);
    this.logger.log({ ip, event: 'challenge_generated' }, 'SIWS challenge issued');
    return { nonce, message, expiresAt };
  }

  async verifySiws(dto: VerifyWalletDto) {
    const { walletAddress, signature, nonce } = dto;

    const redisKey = `siws:nonce:${nonce}`;
    const storedMessage = await this.redis.get(redisKey);
    if (!storedMessage) {
      this.logger.warn({ walletAddress, event: 'invalid_nonce' }, 'SIWS nonce invalid or expired');
      throw new UnauthorizedException('Invalid or expired nonce');
    }
    // Consume nonce — prevents replay attacks
    await this.redis.del(redisKey);

    // Verify Ed25519 signature via Stellar SDK
    try {
      const keypair = StellarSdk.Keypair.fromPublicKey(walletAddress);
      const messageBuffer = Buffer.from(storedMessage, 'utf-8');
      const signatureBuffer = Buffer.from(signature, 'base64');
      const isValid = keypair.verify(messageBuffer, signatureBuffer);
      if (!isValid) throw new Error('Signature mismatch');
    } catch {
      this.logger.warn({ walletAddress, event: 'signature_invalid' }, 'SIWS verification failed');
      throw new UnauthorizedException('Invalid wallet signature');
    }

    // Upsert user record
    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress },
      update: {},
    });

    this.logger.log({ userId: user.id, walletAddress, event: 'auth_success' }, 'SIWS auth success');
    const tokens = await this.issueTokens(user.id, user.walletAddress);
    return {
      ...tokens,
      user: { id: user.id, walletAddress: user.walletAddress, reputationScore: user.reputationScore },
    };
  }

  async refreshTokens(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('No refresh token provided');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    // Rotate: revoke old token
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(user.id, user.walletAddress);
  }

  async logout(userId: string, rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.log({ userId, event: 'logout' }, 'User logged out');
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  private async issueTokens(userId: string, walletAddress: string) {
    const payload = { sub: userId, wallet: walletAddress };
    const accessToken = this.jwtService.sign(payload);
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const refreshTtl = this.config.get<number>('JWT_REFRESH_TTL', 604800);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + refreshTtl * 1000) },
    });
    return { accessToken, refreshToken: rawRefreshToken };
  }
}
