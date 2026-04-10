# Compliance Playbook

Apply this playbook when the project targets regulated industries or enterprise clients requiring formal compliance certifications.

Triggers:
- "SOC2 certified" or "SOC2 Type II" in sales/marketing materials
- Health data, medical records, or HIPAA mentions
- Financial data requiring PCI-DSS scope
- Enterprise contracts with security questionnaires
- "Bank-level security" or "enterprise-grade" positioning
- Government or public sector clients
- EU/UK clients where GDPR audit evidence is required

This playbook focuses on **architecture patterns that produce audit evidence**. For GDPR data subject rights (export, deletion, consent), see `gdpr-data-export.md`. For security controls, see `security.md`.

---

## 1. What to Infer From Frontend

| Frontend Signal | Compliance Implication |
|---|---|
| Medical history, diagnosis, prescriptions | HIPAA PHI scope — Section 4 |
| "SOC2 compliant" badge or trust page | SOC2 evidence artifacts required — Section 3 |
| Credit card, bank account fields | PCI-DSS scope — minimize cardholder data |
| Employee records, HR module | Data classification Tier 3+, access review |
| "Privacy policy", consent checkboxes | GDPR/KVKK — gdpr-data-export.md |
| Audit log, activity history page | Immutable trail required — audit-log.md |
| Role management, org admin panel | Quarterly access review — Section 6 |
| Multi-region deployment | Data residency constraints — Section 5 |

---

## 2. Data Classification

Classify all data before designing storage and access controls.

| Tier | Label | Examples | Controls |
|---|---|---|---|
| 1 | **Public** | Marketing copy, public docs, open API responses | No special controls |
| 2 | **Internal** | Employee emails, internal configs, usage metrics | Access logging, TLS in transit |
| 3 | **Confidential** | Customer PII, credentials, billing data | Encryption at rest, audit log, RBAC |
| 4 | **Restricted** | PHI, PCI data, legal records, encryption keys | Field-level encryption, strict MFA, break-glass access |

Apply classification at the entity level in your data model:

```ts
// Entity comment convention — auditors look for these
/**
 * @classification Restricted
 * @regulation HIPAA
 * @retention 6 years (45 CFR § 164.530(j))
 */
export class MedicalRecord {
  @EncryptedField()  // security.md EncryptionService
  diagnosis: string;

  @EncryptedField()
  medication: string;

  // PHI access always logged — AuditService.record() called in service layer
}
```

---

## 3. SOC2 Type II Patterns

SOC2 audits require **evidence of consistent controls over a 6–12 month period**, not just policies.

### Trust Services Criteria (TSC) Mapping

| Criterion | Code | Backend Evidence Artifact |
|---|---|---|
| Logical access controls | CC6 | RBAC + access review records (Section 6) |
| Encryption in transit | CC6.7 | TLS config + certificate renewal logs |
| Encryption at rest | CC6.1 | EncryptionService usage + key rotation records |
| Monitoring and alerting | CC7 | SecurityAlertService logs + Pino structured logs |
| Change management | CC8 | Git commit history + deployment logs |
| Incident response | CC9 | Incident records with timeline — Section 7 |
| Availability | A1 | Health check logs + uptime records |
| Vulnerability management | CC7.1 | npm audit / Trivy CI results |

### Evidence Collection Service

```ts
// src/modules/compliance/compliance-evidence.service.ts
export class ComplianceEvidenceService {
  /**
   * Called quarterly — generates access review snapshot.
   * Output stored in compliance-evidence/ and referenced in SOC2 audit.
   */
  async generateAccessReview(): Promise<AccessReviewReport> {
    const users = await this.prisma.user.findMany({
      include: { roles: true, lastLoginAt: true },
    });

    const inactive = users.filter(u =>
      u.lastLoginAt < subDays(new Date(), 90)
    );

    const privileged = users.filter(u =>
      u.roles.some(r => ['admin', 'super_admin'].includes(r.name))
    );

    const report: AccessReviewReport = {
      generatedAt: new Date(),
      period: { from: subDays(new Date(), 90), to: new Date() },
      totalUsers: users.length,
      inactiveUsers: inactive.map(u => ({ id: u.id, email: u.email, lastLoginAt: u.lastLoginAt })),
      privilegedUsers: privileged.map(u => ({ id: u.id, email: u.email, roles: u.roles })),
      reviewedBy: null,  // set when admin reviews and signs off
      reviewedAt: null,
    };

    await this.storeEvidence('access-review', report);
    return report;
  }

  /**
   * Called after each deployment — records what changed.
   */
  async recordDeployment(data: {
    version: string;
    deployedBy: string;
    changes: string;
    environment: string;
  }): Promise<void> {
    await this.storeEvidence('deployment', { ...data, deployedAt: new Date() });
  }

  private async storeEvidence(type: string, data: unknown): Promise<void> {
    // Store in DB for queryable history
    await this.prisma.complianceEvidence.create({
      data: {
        type,
        content: JSON.stringify(data),
        createdAt: new Date(),
      },
    });
  }
}
```

### ComplianceEvidence Entity

```
ComplianceEvidence
  id
  type: 'access-review' | 'deployment' | 'incident' | 'vulnerability-scan' | 'key-rotation'
  content (JSON)
  created_at
  reviewed_by (nullable) → User
  reviewed_at (nullable)
```

---

## 4. HIPAA Technical Safeguards

Apply when any Protected Health Information (PHI) is stored or transmitted.

### PHI Definition

PHI includes any information that can identify an individual AND relates to health:
- Diagnoses, conditions, medications, lab results
- Appointment dates, treatment history
- Names, addresses, phone numbers **when combined with health data**
- Insurance IDs, account numbers in health context

### Technical Safeguard Requirements

| Requirement | Implementation |
|---|---|
| Access Control | RBAC with `health_viewer`, `health_editor`, `health_admin` roles |
| Audit Controls | Every PHI read/write logged to AuditLog (audit-log.md) |
| Integrity | Checksums on PHI records; detect tampering |
| Transmission Security | TLS 1.2+ for all PHI in transit; reject HTTP |
| Automatic Logoff | Session timeout: 15 minutes inactivity for PHI-capable roles |

```ts
// Minimum Necessary principle — never fetch more PHI than needed
// BAD: selecting full record when only status is needed
const patient = await prisma.medicalRecord.findUnique({ where: { id } });

// GOOD: select only what the operation requires
const status = await prisma.medicalRecord.findUnique({
  where: { id },
  select: { status: true, updatedAt: true },
});
```

### PHI Access Audit (mandatory for every PHI read)

```ts
// src/modules/health/medical-records.service.ts
async getRecord(recordId: string, requestingUser: User): Promise<MedicalRecord> {
  // Always audit PHI access
  await this.audit.record({
    actor: requestingUser.id,
    action: 'phi.read',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    metadata: {
      reason: 'treatment',  // treatment | payment | operations | other
      ipAddress: requestingUser.ipAddress,
    },
  });

  const record = await this.prisma.medicalRecord.findUnique({
    where: { id: recordId },
    select: this.ALLOWED_FIELDS,  // defined per role
  });

  if (!record) throw new NotFoundException();
  return this.decryptPhi(record);
}
```

### Business Associate Agreement (BAA)

Any service that stores or processes PHI on your behalf requires a BAA:

| Service | BAA Required | BAA Available |
|---|---|---|
| AWS | ✅ | Yes — AWS BAA |
| Google Cloud | ✅ | Yes — GCP HIPAA |
| Stripe (if storing health billing) | ✅ | Yes |
| SendGrid / Postmark (if sending PHI) | ✅ | Contact vendor |
| Logging services (Datadog, Logtail) | ✅ | Verify before sending PHI logs |

**Never send PHI to a service without a signed BAA.**

---

## 5. Data Residency

Enterprise and EU clients may require data to remain in specific regions.

```ts
// src/config/data-residency.config.ts
export const DATA_RESIDENCY = {
  EU: {
    allowedRegions: ['eu-west-1', 'eu-central-1'],
    prohibitedTransfers: ['US'],  // without Standard Contractual Clauses
  },
  US_HIPAA: {
    allowedRegions: ['us-east-1', 'us-west-2'],
    requiresBAA: true,
  },
};
```

Enforce at the infrastructure level (Railway region, AWS region selection) and document in `repo-handoff.json` under `deploymentTarget.region`.

---

## 6. Access Review Process

Run quarterly. Required for SOC2, ISO 27001, and HIPAA.

### Automated Review Trigger

```ts
// Cron: quarterly access review
@Cron('0 9 1 1,4,7,10 *')  // 9 AM on Jan 1, Apr 1, Jul 1, Oct 1
async quarterlyAccessReview(): Promise<void> {
  const report = await this.compliance.generateAccessReview();

  // Notify security admin
  await this.notifications.send({
    to: process.env.SECURITY_ADMIN_EMAIL,
    template: 'access-review-ready',
    data: {
      reportId: report.id,
      inactiveCount: report.inactiveUsers.length,
      privilegedCount: report.privilegedUsers.length,
      reviewUrl: `${process.env.ADMIN_URL}/compliance/access-review/${report.id}`,
    },
  });
}
```

### Review Checklist

For each access review period, an admin must:
1. Review list of users with privileged roles → revoke if no longer needed
2. Review list of inactive users (90+ days) → deactivate or confirm
3. Review service account list → rotate credentials older than 180 days
4. Sign off on report in admin panel → sets `reviewed_by` + `reviewed_at`

---

## 7. Incident Response

Define before an incident occurs. Required for SOC2 CC9 and HIPAA Breach Notification Rule.

### Response Phases

```
1. DETECT     → SecurityAlertService fires OR user report OR monitoring alert
2. CONTAIN    → Isolate affected component; block IP/session if needed
3. ASSESS     → Determine scope: was data accessed? How many records? What classification?
4. NOTIFY     → Internal: security team. External: depends on regulation (see table below)
5. ERADICATE  → Fix root cause
6. RECOVER    → Restore from clean backup if needed; verify integrity
7. POST-MORTEM → Document timeline, root cause, remediation, process changes
```

### Notification Timelines

| Regulation | Who to Notify | Deadline | Trigger |
|---|---|---|---|
| GDPR | Data Protection Authority + affected users | 72 hours (DPA), without undue delay (users) | Any breach of personal data |
| HIPAA | HHS + affected individuals | 60 days | Breach of unsecured PHI |
| SOC2 | Affected customers | Per contract SLA | Availability or confidentiality incident |
| KVKK (Turkey) | KVKK Board | 72 hours | Breach of personal data |

### Incident Record Entity

```
IncidentRecord
  id
  detected_at
  type: 'data_breach' | 'unauthorized_access' | 'availability' | 'integrity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  affected_record_count (nullable)
  affected_data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
  description
  containment_actions (JSON)
  root_cause
  notification_sent_at (nullable)
  notification_recipients (JSON)
  resolved_at (nullable)
  post_mortem_url (nullable)
  created_by → User
```

---

## 8. Data Retention & Deletion

Define retention per data type. Required for GDPR, HIPAA, and audit defensibility.

| Data Type | Minimum Retention | Maximum Retention | Regulation |
|---|---|---|---|
| Medical records (PHI) | 6 years from creation | 10 years | HIPAA 45 CFR §164.530(j) |
| Financial transactions | 7 years | 10 years | SOX / Tax law |
| Audit logs | 1 year (active) + 6 years (archive) | — | SOC2 / HIPAA |
| User activity logs | 90 days (hot) + 1 year (cold) | — | Best practice |
| Consent records | Duration of relationship + 3 years | — | GDPR |
| Backup files | 30 days (daily) + 1 year (monthly) | — | Best practice |

### Automated Retention Job

```ts
@Cron('0 2 * * *')  // 2 AM daily
async enforceRetentionPolicy(): Promise<void> {
  // Delete user activity logs older than 90 days (hot storage)
  const cutoff = subDays(new Date(), 90);
  const deleted = await this.prisma.activityLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      archived: false,  // don't delete already-archived
    },
  });

  await this.audit.record({
    actor: 'system',
    action: 'retention.purge',
    metadata: { deletedCount: deleted.count, cutoffDate: cutoff },
  });
}
```

### Legal Hold

When litigation or investigation is active, suspend automated deletion:

```ts
async applyLegalHold(userId: string, reason: string): Promise<void> {
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      legalHold: true,
      legalHoldReason: reason,
      legalHoldAppliedAt: new Date(),
    },
  });
}
// All deletion jobs must check: WHERE legal_hold = false
```

---

## 9. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| GET | /admin/compliance/access-review | ✅ admin | List access review reports |
| POST | /admin/compliance/access-review | ✅ admin | Trigger access review manually |
| PATCH | /admin/compliance/access-review/:id/sign-off | ✅ admin | Sign off on access review |
| GET | /admin/compliance/evidence | ✅ admin | List compliance evidence artifacts |
| GET | /admin/compliance/incidents | ✅ admin | List incident records |
| POST | /admin/compliance/incidents | ✅ admin | Create incident record |
| PATCH | /admin/compliance/incidents/:id | ✅ admin | Update incident record |
| GET | /admin/compliance/data-map | ✅ admin | View data classification map |

---

## 10. Environment Variables

```bash
# Compliance Notifications
SECURITY_ADMIN_EMAIL=security@example.com
COMPLIANCE_ALERT_EMAIL=compliance@example.com
DPO_EMAIL=dpo@example.com           # Data Protection Officer (GDPR)

# Retention Policy (override defaults)
LOG_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=365
BACKUP_RETENTION_DAYS=30

# Access Review Schedule
ACCESS_REVIEW_ADMIN_EMAIL=admin@example.com

# HIPAA
PHI_SESSION_TIMEOUT_MINUTES=15      # auto-logoff for PHI-capable sessions
```

---

## 11. Compliance Rules

- **Data classification mandate:** Every entity containing customer data must have a `@classification` tag in its JSDoc comment — `Public`, `Internal`, `Confidential`, or `Restricted`.
- **PHI audit:** Every read or write of PHI (Tier 4 health data) must be logged via `AuditService.record()` with `reason` field set.
- **BAA requirement:** PHI must never be sent to a third-party service without a signed BAA. Log the BAA reference in deployment documentation.
- **Access review:** A quarterly access review must be completed and signed off before each SOC2 audit period closes.
- **Retention enforcement:** Automated retention jobs must run on a schedule. Manual deletion of records outside the retention policy requires written justification in `ComplianceEvidence`.
- **Legal hold:** Deletion jobs must check `legal_hold` flag before deleting any record.
- **Incident notification:** All data breaches involving Tier 3+ data must have an `IncidentRecord` created within 24 hours of detection.
- **Minimum necessary:** Service methods must request only the fields required for the operation. `findUnique({ include: { allRelations: true } })` is forbidden for PHI-containing entities.

---

## 12. File Structure

```
src/
├── modules/
│   └── compliance/
│       ├── compliance.module.ts
│       ├── compliance.controller.ts        ← access review, evidence, incident endpoints
│       ├── compliance.service.ts           ← orchestration
│       ├── compliance-evidence.service.ts  ← generate + store audit artifacts
│       └── incident-response.service.ts    ← incident lifecycle management
├── entities/
│   ├── compliance-evidence.entity.ts       ← SOC2 / HIPAA audit artifacts
│   └── incident-record.entity.ts          ← incident response log
├── jobs/
│   ├── access-review.job.ts               ← quarterly cron
│   └── retention-policy.job.ts            ← daily deletion enforcement
└── config/
    └── compliance.config.ts               ← retention periods, notification targets
```
