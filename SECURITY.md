# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in StellarSplit, please report it responsibly.

**Do NOT** open a public GitHub issue for security vulnerabilities.

**Email:** security@stellarsplit.app (or open a private GitHub security advisory)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We aim to respond within 48 hours and will keep you informed of our progress.

## Security Measures

- Auth: Sign In With Stellar (SIWS) — Ed25519 signature verification, no passwords stored
- JWT: Short-lived access tokens (15 min), HttpOnly Secure refresh-token cookies
- Secrets: All credentials managed via environment variables, never hardcoded
- Rate limiting: All endpoints rate-limited (auth endpoints: 10 req/min per IP)
- CORS: Restricted to configured frontend origin
- Helmet: HTTP security headers on all responses
- Input validation: All inputs validated with class-validator, whitelist mode
- File uploads: MIME type validation + 10 MB limit + S3 signed URLs
- Dependency auditing: npm audit on every CI run
