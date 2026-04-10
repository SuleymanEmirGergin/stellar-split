# File Uploads & Storage Playbook

This playbook guides the Backend Integrator Agent when implementing file upload handling and storage integration derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the scope of the upload system:

- **File / Image Input Fields**: Any `<input type="file">` implies an upload endpoint.
- **Avatar / Profile Picture**: Single-file upload with image-only constraint.
- **Document Upload**: PDF, Word, CSV — implies mime-type restrictions and larger size limits.
- **Gallery / Media Manager**: Multiple file uploads, thumbnail generation, and deletion.
- **Import Flows**: CSV/Excel uploads that trigger background processing.
- **Drag & Drop Zones**: Implies chunked or multi-file uploads with progress tracking.
- **"Download" or "View" Buttons**: Implies signed URL generation for private files.

---

## 2. Required Backend Entities

```
File / Asset
  - id
  - owner_id (user or organization)
  - original_name
  - storage_key (path in storage bucket)
  - mime_type
  - size_bytes
  - visibility: public | private
  - url (for public) or null (for signed URL)
  - created_at
```

For import flows, add:

```
ImportJob
  - id
  - file_id
  - status: pending | processing | done | failed
  - error_message
  - processed_rows
  - created_at
```

---

## 3. Required API Endpoints

### Core Upload
- `POST /uploads` — Accept file, validate, store, return metadata
- `DELETE /uploads/:id` — Delete file and remove from storage

### Signed URL Access (for private files)
- `GET /uploads/:id/url` — Generate time-limited signed URL (15–60 min TTL)

### Import Flows (if applicable)
- `POST /imports` — Accept CSV/Excel, enqueue background processing job
- `GET /imports/:id` — Poll import job status

---

## 4. Storage Provider Strategy

Always isolate the storage provider behind an adapter:

```
controller → uploadService → storageAdapter (S3 / GCS / Cloudinary)
```

**Never** call the SDK directly inside a controller or service.

### Adapter Interface

```typescript
interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>
}
```

### Storage Key Structure

Use a predictable, organized key structure:

```
uploads/{userId}/{year}/{month}/{uuid}.{ext}
```

---

## 5. Validation Rules

| Rule | Constraint |
|---|---|
| Max file size | Define per context (avatar: 5MB, docs: 50MB, imports: 200MB) |
| Allowed mime types | Whitelist only — never trust client-provided content-type |
| Re-validate on server | Always re-check mime type from file buffer (not just extension) |
| Virus / malware scan | Consider for user-submitted documents |
| Duplicate detection | Optional — hash-based deduplication |

---

## 6. Security Rules

- **Access Control**: Validate that the requester owns the file before generating a signed URL or deleting.
- **Visibility**: Default all uploads to `private`. Only set `public` when explicitly required (e.g., product images).
- **Signed URLs**: Never expose raw storage URLs for private files. Always generate short-lived signed URLs.
- **Path Traversal**: Never use user-provided filenames as storage keys. Generate UUID-based keys server-side.

---

## 7. Background Processing (Import Flows)

When a file triggers heavy processing:

- Accept the upload → store file → enqueue job → return `jobId` immediately.
- Worker processes the file asynchronously.
- Client polls `GET /imports/:id` for status.
- On failure: store error message and rollback partial state.

---

## 8. Environment Variables

```bash
# Storage Provider
STORAGE_PROVIDER=s3                  # s3 | gcs | cloudinary | local
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Optional: CDN prefix for public files
CDN_URL=https://cdn.yourapp.com

# Signed URL TTL (seconds)
SIGNED_URL_TTL=900
```

---

## 9. File Structure

```
src/
  uploads/
    uploads.controller.ts
    uploads.service.ts
    uploads.module.ts
    dto/
      create-upload.dto.ts
    adapters/
      storage.adapter.interface.ts
      s3.adapter.ts
      gcs.adapter.ts
    entities/
      file.entity.ts
```
