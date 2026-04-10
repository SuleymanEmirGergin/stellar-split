# File Storage (Advanced) Playbook

Apply this playbook when the project requires advanced cloud storage patterns beyond basic file upload: large file handling (>10 MB), virus scanning, CDN delivery, or HIPAA/regulated file storage.

Apply alongside `uploads.md`. This playbook covers the **storage layer implementation** — actual SDK calls, presigned URL patterns, multipart chunking, virus scan pipelines, CDN, and lifecycle rules. `uploads.md` covers the entity layer (File model, StorageAdapter interface, import workers).

---

## 1. What to Infer From Frontend

| Signal | Implication |
|---|---|
| `maxSizeMB > 20` in any upload definition | Multipart upload required — Section 4 |
| File types include `video/mp4`, `application/octet-stream`, `image/dicom` | Large binary handling — Section 4 |
| HIPAA/medical context, legal documents | SSE-KMS, 300s URL TTL, audit log on every download — Section 5 |
| "Virus scan" or "malware check" in notes | Async scan pipeline — Section 5 |
| CDN, edge delivery, or "fast global access" mentioned | CloudFront/R2 CDN setup — Section 6 |
| `visibility: "signed-url"` with short expiry noted | Presigned GET URL with custom TTL — Section 3 |
| Mixed public + private file types | Separate public bucket + private bucket — Section 2 |

Do not apply in isolation — always pair with `uploads.md` for the entity/model layer.

---

## 2. Storage Provider Selection

| Provider | Egress Cost | S3-Compatible API | Native CDN | Free Tier | Best For |
|---|---|---|---|---|---|
| **AWS S3** | $0.09/GB | ✅ native | CloudFront | 5 GB/mo | Default choice, most mature, HIPAA BAA available |
| **Cloudflare R2** | $0 egress | ✅ | ✅ automatic | 10 GB/mo | High-download media, cost-sensitive, zero egress |
| **Google Cloud Storage** | $0.12/GB | Partial | Cloud CDN | 5 GB/mo | GCP-native stacks, CMEK for HIPAA |
| **Supabase Storage** | Included in plan | ✅ | ❌ | 1 GB | Supabase projects only |

**Decision rules:**
- PHI/HIPAA files → **AWS S3** with SSE-KMS + signed BAA
- High-egress media (video, images served globally) → **Cloudflare R2** (zero egress fees)
- Supabase stack → **Supabase Storage**
- Default → **AWS S3**

---

## 3. Presigned URL Patterns

Two patterns — choose based on whether uploads should pass through your API server:

**Pattern A — Presigned GET URL (download):** Client requests URL from API → API generates signed URL → client fetches directly from S3.

**Pattern B — Presigned PUT URL (direct-to-S3 upload):** Client requests upload URL from API → client uploads directly to S3, bypassing API server → client notifies API of completion. Strongly preferred for large files.

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION });

// ─── Pattern A: Presigned GET URL (download) ──────────────────────────────────
export async function getDownloadUrl(
  key: string,
  ttlSeconds: number = parseInt(process.env.STORAGE_SIGNED_URL_TTL ?? "3600")
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: ttlSeconds });
}

// ─── Pattern B: Presigned PUT URL (direct-to-S3 upload) ──────────────────────
export async function getUploadUrl(
  contentType: string,
  originalFilename: string
): Promise<{ uploadUrl: string; s3Key: string }> {
  // UUID prefix prevents enumeration and filename collisions
  const s3Key = `uploads/${randomUUID()}/${sanitizeFilename(originalFilename)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300, // Short TTL for upload URLs — 5 minutes
  });

  return { uploadUrl, s3Key };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}
```

**Security rules for presigned URLs:**
- Never expose the raw S3 key to clients — return only the presigned URL or a file ID
- Validate `Content-Type` server-side against allowed MIME list after upload completes
- PHI files: maximum **300 seconds** TTL, log every download to audit log
- Upload URLs: maximum **300 seconds** TTL regardless of file type
- Generate key with UUID prefix always — never use predictable paths

---

## 4. Multipart Upload (Files > 25 MB)

Required above 100 MB. Recommended above 25 MB. S3 part size constraints: minimum 5 MB per part (except last), maximum 10,000 parts.

**Flow:**
1. `POST /storage/multipart/initiate` → API returns `uploadId`, `key`, presigned URL per part
2. Client uploads each part directly to S3 → receives `ETag` per part
3. `POST /storage/multipart/complete` → API calls S3 `completeMultipartUpload` with all ETags
4. On cancel/timeout: `DELETE /storage/multipart/abort` → API calls `abortMultipartUpload`

```typescript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

// Step 1: Initiate
export async function initiateMultipartUpload(
  contentType: string,
  originalFilename: string,
  partCount: number
): Promise<{ uploadId: string; key: string; partUrls: string[] }> {
  const key = `uploads/${randomUUID()}/${sanitizeFilename(originalFilename)}`;

  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: "aws:kms", // Required for HIPAA — SSE-KMS
    })
  );

  // One presigned URL per part (1-indexed, S3 requirement)
  const partUrls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          UploadId: UploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: 3600 }
      )
    )
  );

  return { uploadId: UploadId!, key, partUrls };
}

// Step 3: Complete
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<void> {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) },
    })
  );
}

// Abort — call on user cancel or upload timeout
export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    })
  );
  // Partial parts accrue S3 storage cost until aborted — always abort on cancel
}
```

---

## 5. Virus Scanning Pipeline

Mandatory for any user-uploaded file in regulated contexts. Strongly recommended for all production systems.

**Architecture:** File uploaded → lands in `pending/` prefix → S3 event notification or API call triggers BullMQ scan job → ClamAV scans file → clean files move to `clean/` prefix → infected files move to `quarantine/` prefix.

```typescript
// BullMQ job — triggered after upload completion notification
export class VirusScanJob {
  static readonly QUEUE = "virus-scan";

  async process(job: Job<{ s3Key: string; fileId: string }>) {
    const { s3Key, fileId } = job.data;
    const tmpPath = `/tmp/${randomUUID()}`;

    try {
      // 1. Download from S3 to ephemeral /tmp
      await downloadFromS3(s3Key, tmpPath);

      // 2. Scan with ClamAV via clamd TCP socket
      const clam = await new NodeClam().init({
        clamdscan: { host: process.env.CLAMAV_HOST, port: parseInt(process.env.CLAMAV_PORT) },
      });
      const { isInfected, viruses } = await clam.scanFile(tmpPath);

      if (isInfected) {
        // Move to quarantine — never serve quarantined files
        await s3.send(new CopyObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${s3Key}`,
          Key: `quarantine/${s3Key}`,
        }));
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key }));

        await db.file.update({
          where: { id: fileId },
          data: { status: "QUARANTINED", virusName: viruses[0] ?? "unknown" },
        });
        await notifySecurityTeam({ fileId, viruses });
      } else {
        // Move to clean prefix — safe to serve
        const cleanKey = `clean/${s3Key}`;
        await s3.send(new CopyObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${s3Key}`,
          Key: cleanKey,
        }));
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key }));

        await db.file.update({
          where: { id: fileId },
          data: { status: "READY", s3Key: cleanKey },
        });
      }
    } finally {
      // Always clean up /tmp — regardless of scan result
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }
}
```

**File status state machine:**
```
PENDING_SCAN → READY         (clean scan)
PENDING_SCAN → QUARANTINED   (infected)
PENDING_SCAN → SCAN_FAILED   (ClamAV unreachable — retry up to 3×)
READY        → DELETED       (user or admin delete)
```

**Rule:** Never generate a presigned GET URL for a file where `status !== 'READY'`. Always check status before generating download URL.

---

## 6. CDN Integration

Use CDN only for **public or non-sensitive files**. Never put CDN in front of PHI or private files — presigned URLs bypass CDN cache due to unique query params.

**Option A — CloudFront in front of S3 (AWS):**
```typescript
// Public asset served via CloudFront CDN
export function getCdnUrl(s3Key: string): string {
  return `${process.env.CDN_BASE_URL}/${s3Key}`;
}

// Private file — presigned URL only (no CDN)
export async function getPrivateUrl(s3Key: string, ttl: number): Promise<string> {
  return getDownloadUrl(s3Key, ttl);
}
```

**Option B — Cloudflare R2 with automatic CDN:**
Zero egress fees. Best for high-download public content (profile images, product photos, video thumbnails).

**Cache-Control strategy:**

| File Type | Cache-Control | CDN? |
|---|---|---|
| Public static assets (logos, icons) | `public, max-age=31536000, immutable` | ✅ |
| User profile images | `public, max-age=86400` | ✅ |
| User documents (non-sensitive) | No CDN — presigned GET URL (TTL: 1h) | ❌ |
| PHI / medical records | No CDN — presigned GET URL (TTL: 5min), audit log | ❌ |

---

## 7. Storage Lifecycle Rules

Configure in Terraform, AWS CDK, or AWS Console. These rules run automatically and prevent orphaned storage costs.

```json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 },
      "Status": "Enabled"
    },
    {
      "ID": "transition-clean-to-ia",
      "Filter": { "Prefix": "clean/" },
      "Transitions": [
        { "Days": 90, "StorageClass": "STANDARD_IA" },
        { "Days": 365, "StorageClass": "GLACIER_IR" }
      ],
      "Status": "Enabled"
    },
    {
      "ID": "delete-quarantined",
      "Filter": { "Prefix": "quarantine/" },
      "Expiration": { "Days": 30 },
      "Status": "Enabled"
    },
    {
      "ID": "expire-unscanned-pending",
      "Filter": { "Prefix": "pending/" },
      "Expiration": { "Days": 2 },
      "Status": "Enabled"
    }
  ]
}
```

**Cost savings:** STANDARD → STANDARD_IA saves ~45% after 90 days. STANDARD_IA → GLACIER_IR saves ~75% for archives. Aborting incomplete multipart uploads after 24h eliminates silent partial-upload charges.

---

## 8. Required API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| POST | /storage/upload-url | ✅ | Return presigned PUT URL for single-file direct-to-S3 upload |
| POST | /storage/multipart/initiate | ✅ | Start multipart upload; return uploadId + presigned part URLs |
| POST | /storage/multipart/complete | ✅ | Complete multipart upload with all part ETags |
| DELETE | /storage/multipart/abort | ✅ | Abort in-progress multipart, release partial S3 storage |
| GET | /storage/download-url/:fileId | ✅ | Return presigned GET URL (validates status = READY first) |
| DELETE | /storage/files/:fileId | ✅ owner/admin | Soft-delete file record + hard-delete S3 object |
| GET | /admin/storage/quarantined | ✅ admin | List quarantined files with virus names |

---

## 9. Security Rules

- **Path integrity:** Always prefix key with UUID — `uploads/{uuid}/{sanitizedFilename}`. Never accept user-provided S3 keys.
- **Bucket visibility:** Private bucket by default — bucket policy must deny `s3:GetObject` without presigned auth. Never expose user-uploaded files from a public bucket.
- **PHI files:** SSE-KMS encryption (not SSE-S3), 300 second TTL maximum, audit log every download with `actor_id`, `ip_address`, `timestamp`.
- **Virus scan gate:** No file transitions to `READY` before scan passes. Check `status` before every download URL generation.
- **Extension blocklist:** Reject `.exe`, `.js`, `.sh`, `.php`, `.py`, `.bat`, `.cmd` — even if MIME type appears safe. Validate server-side after upload, not only client-side.
- **Size enforcement:** Apply `ContentLength` constraint in presigned URL AND validate in API before generating upload URL.
- **Multipart cleanup:** Abort incomplete uploads after 24h via S3 lifecycle rule. Log all abortions.
- **Key opacity:** Never return the raw S3 key to clients. Return only file ID or presigned URL.

---

## 10. Environment Variables

```bash
# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=myapp-uploads-prod

# Encryption (HIPAA — SSE-KMS)
AWS_S3_KMS_KEY_ID=                  # KMS key ARN for server-side encryption

# Presigned URL TTLs
STORAGE_SIGNED_URL_TTL=3600         # Default download TTL (seconds)
STORAGE_PHI_SIGNED_URL_TTL=300      # PHI download TTL (5 minutes)
STORAGE_UPLOAD_URL_TTL=300          # Upload URL TTL (5 minutes)

# Cloudflare R2 (alternative to S3)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=                      # https://pub.yourdomain.com (CDN URL for public assets)

# CDN
CDN_BASE_URL=                       # https://cdn.yourdomain.com (optional — CloudFront)

# Virus Scanning
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
VIRUS_SCAN_ENABLED=true             # Set false in development only
```

---

## 11. File Structure

```
src/
├── common/
│   └── storage/
│       ├── storage.service.ts         ← getUploadUrl(), getDownloadUrl(), deleteFile()
│       ├── multipart.service.ts       ← initiateMultipartUpload(), complete(), abort()
│       ├── storage.types.ts           ← StorageProvider interface, FileStatus enum
│       └── providers/
│           ├── s3.provider.ts         ← AWS S3 implementation
│           └── r2.provider.ts         ← Cloudflare R2 implementation (S3-compatible API)
├── modules/
│   └── storage/
│       ├── storage.controller.ts      ← REST endpoints
│       ├── storage.service.ts         ← Business logic: ownership checks, status validation
│       └── storage.module.ts
├── jobs/
│   └── virus-scan.job.ts              ← BullMQ job: scan → clean/ or quarantine/
└── prisma/
    └── schema.prisma                  ← File model (partial, extend from uploads.md)
```

**Prisma `File` model:**
```prisma
model File {
  id          String     @id @default(uuid())
  ownerId     String
  s3Key       String     @unique
  bucket      String
  filename    String
  contentType String
  sizeBytes   Int
  status      FileStatus @default(PENDING_SCAN)
  virusName   String?                   // Set if status = QUARANTINED
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([ownerId])
  @@index([status])
}

enum FileStatus {
  PENDING_SCAN
  READY
  QUARANTINED
  SCAN_FAILED
  DELETED
}
```
