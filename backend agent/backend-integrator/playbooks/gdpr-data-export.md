# GDPR & Data Export Playbook

Apply this playbook when the frontend includes:
- "Download my data" or "Export account data" buttons
- Account deletion with confirmation flow
- Privacy settings page
- Cookie consent management
- Data retention or "right to erasure" language

---

## Decision: What GDPR / KVKK Requires

| Right | Endpoint | Notes |
|---|---|---|
| Right of Access (data export) | `POST /users/me/data-export` | Async — deliver via email or download link |
| Right to Erasure (right to be forgotten) | `DELETE /users/me` | Soft anonymize, not hard delete |
| Right to Rectification | `PATCH /users/me` | Standard update endpoint |
| Data Portability | `GET /users/me/data-export/download` | JSON or ZIP format |
| Consent Management | `PATCH /users/me/consent` | Record explicit consent per purpose |

---

## 1. Data Export Architecture

### Strategy: Async Export via Background Job

Never generate exports synchronously. Large user datasets can take seconds to minutes.

```
POST /users/me/data-export
  → Create DataExportRequest record (status: pending)
  → Enqueue generate-data-export job
  → Return 202 Accepted

[Worker] generate-data-export job
  → Collect all user data across entities
  → Serialize to JSON
  → Create ZIP archive
  → Upload to private S3 with 24h signed URL
  → Update DataExportRequest (status: ready, download_url)
  → Send "Your data is ready" email

GET /users/me/data-export/status
  → Return current status + download_url if ready
```

### Entity: DataExportRequest

```
DataExportRequest
  id, user_id → User
  status: pending | processing | ready | failed | expired
  download_url (signed S3 URL, nullable)
  expires_at (48h from ready)
  requested_at, completed_at
```

---

## 2. What to Include in the Export

Define a `DataExportService` that collects all user-owned data:

```ts
// src/modules/gdpr/data-export.service.ts
export class DataExportService {
  async collectUserData(userId: string): Promise<UserDataExport> {
    const [profile, orders, addresses, reviews, consents, sessions] =
      await Promise.all([
        this.usersRepo.findById(userId),
        this.ordersRepo.findByUser(userId),
        this.addressesRepo.findByUser(userId),
        this.reviewsRepo.findByUser(userId),
        this.consentRepo.findByUser(userId),
        this.sessionsRepo.findByUser(userId),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: this.sanitizeProfile(profile),
      orders,
      addresses,
      reviews,
      consents,
      sessions: sessions.map(s => ({
        ip: s.ip_address,       // include
        userAgent: s.user_agent,
        createdAt: s.created_at,
        // do NOT include session token hashes
      })),
    };
  }
}
```

**Include:**
- Profile (name, email, created_at, preferences)
- All content the user created (posts, orders, reviews, messages)
- Consent records with timestamps
- Login history (IP, user agent, timestamp) — no token hashes

**Exclude:**
- Password hashes
- Internal IDs of other users
- Internal system metadata (queue job IDs, internal flags)
- Derived/aggregated analytics

---

## 3. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| POST | /users/me/data-export | ✅ | Request data export |
| GET | /users/me/data-export/status | ✅ | Check export status + download URL |
| DELETE | /users/me | ✅ | Request account deletion |
| GET | /users/me/consent | ✅ | View consent records |
| PATCH | /users/me/consent | ✅ | Update consent preferences |
| POST | /consent/record | ❌ | Record anonymous consent event |

---

## 4. Account Deletion — Right to Erasure

**Rule: Anonymize, do not hard delete.**

Hard deleting accounts breaks referential integrity (orders, reviews, audit logs still reference the user). The correct approach is anonymization.

```ts
// src/modules/gdpr/account-deletion.service.ts
export class AccountDeletionService {
  async anonymizeUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      // Anonymize PII
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.invalid`,
          full_name: 'Deleted User',
          password_hash: null,
          avatar_url: null,
          deleted_at: new Date(),
        },
      }),
      // Revoke all sessions
      this.prisma.refreshToken.deleteMany({ where: { user_id: userId } }),
      // Cancel pending invitations
      this.prisma.invitation.updateMany({
        where: { email: /* original email */ , accepted_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    // Delete avatar from S3
    await this.storage.delete(user.avatar_key);

    // Notify via email (while email still valid — before anonymization)
    await this.email.send({ to: originalEmail, template: 'account-deleted' });
  }
}
```

**Deletion timing options:**

| Option | When to Use |
|---|---|
| Immediate anonymization | Simple apps without pending obligations |
| 30-day grace period | Users may want to cancel — show "pending deletion" state |
| Scheduled deletion | Subscription apps — delete after billing period ends |

---

## 5. Consent Entity

Track every consent action with immutable records.

```
Consent
  id, user_id → User (nullable for anonymous)
  purpose: marketing | analytics | functional | third_party_sharing
  action: granted | revoked
  source: registration_form | cookie_banner | settings_page | api
  ip_address, user_agent
  recorded_at
```

**Rules:**
- Never update a consent record — create a new one
- Query latest record per purpose to determine current status
- Store IP + user agent for audit trail
- Consent must be granular — not one checkbox for everything

---

## 6. Rate Limiting

| Endpoint | Limit | Reason |
|---|---|---|
| POST /users/me/data-export | 1 request per 24h | Export is expensive; abuse prevention |
| DELETE /users/me | 3 requests per 24h | Confirmation flow may retry |

---

## 7. Background Job: `generate-data-export`

```ts
// Queue: gdpr
// Retry: 3x with 5 min backoff
// DLQ: yes — alert on failure

async process(job: Job<{ userId: string; exportRequestId: string }>) {
  const { userId, exportRequestId } = job.data;

  await this.exportRequest.update(exportRequestId, { status: 'processing' });

  try {
    const data = await this.dataExportService.collectUserData(userId);
    const zipBuffer = await this.buildZip(data);
    const key = `exports/${exportRequestId}.zip`;
    await this.storage.uploadPrivate(key, zipBuffer);
    const signedUrl = await this.storage.signedUrl(key, { expiresIn: 172800 }); // 48h

    await this.exportRequest.update(exportRequestId, {
      status: 'ready',
      download_url: signedUrl,
      expires_at: addHours(new Date(), 48),
      completed_at: new Date(),
    });

    await this.email.send({
      to: user.email,
      template: 'data-export-ready',
      data: { downloadUrl: signedUrl, expiresIn: '48 hours' },
    });
  } catch (error) {
    await this.exportRequest.update(exportRequestId, { status: 'failed' });
    throw error; // triggers BullMQ retry
  }
}
```

---

## 8. Environment Variables

```bash
GDPR_EXPORT_BUCKET=my-app-exports
GDPR_EXPORT_URL_TTL=172800        # 48 hours
GDPR_DELETION_GRACE_PERIOD_DAYS=30
GDPR_MAX_EXPORTS_PER_DAY=1
```

---

## 9. Security Rules

- Export files must be in a **private** S3 bucket — never public
- Signed URLs must expire (48h max)
- Only the owning user may access their export URL
- Email sent to verified email address only
- Account deletion requires password re-confirmation
- Log all GDPR actions in AuditLog with `purpose: gdpr`

---

## 10. Edge Cases

| Scenario | Handling |
|---|---|
| User requests export while previous is still pending | Return existing request, do not create new |
| Export job fails | Mark as failed, allow user to retry after 1h cooldown |
| User deletes account before export is ready | Cancel export job, anonymize immediately |
| Exported ZIP download link expired | User must request a new export |
| User has no data to export | Return minimal JSON (profile only), still send email |

---

## 11. File Structure

```
src/
├── modules/
│   └── gdpr/
│       ├── gdpr.module.ts
│       ├── data-export.service.ts       ← collectUserData, buildZip
│       ├── account-deletion.service.ts  ← anonymizeUser
│       ├── consent.service.ts           ← record, query latest per purpose
│       └── dto/
│           ├── request-export.dto.ts
│           └── update-consent.dto.ts
├── jobs/
│   └── generate-data-export.processor.ts  ← BullMQ worker
└── entities/
    ├── data-export-request.entity.ts
    └── consent.entity.ts
```
