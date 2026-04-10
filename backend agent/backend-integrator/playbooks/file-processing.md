# File Processing Playbook

Apply this playbook when the frontend includes:
- Video upload with player or thumbnail preview
- PDF viewer or document processor
- "Process", "Convert", or "Resize" buttons after upload
- Image gallery with auto-thumbnails or watermarks
- CSV/Excel import with validation feedback
- Document OCR or text extraction
- Progress indicator for long-running file operations

---

## Decision: Which Processing Type

| Signal | Type | Guide |
|---|---|---|
| Image resize, thumbnail, watermark | Image Processing | Section 2 |
| PDF text extraction, merge, split | PDF Processing | Section 3 |
| Video transcoding, thumbnail | Video Processing | Section 4 |
| CSV/Excel import with row validation | Data Import | Section 5 |
| OCR, document understanding | Document AI | Section 6 |
| API endpoints reference | All types | Section 7 |

---

## 1. Core Architecture

All file processing must be **asynchronous** via background jobs. Never block HTTP handlers.

```
POST /files → Upload raw file to S3 (private) → Create FileProcessingJob → Return 202
[Worker] → Download from S3 → Process → Upload result to S3 → Update status → Notify
GET /files/:id/status → Return progress, output URLs
```

### Entity: ProcessingJob

```
FileProcessingJob
  id, user_id → User
  input_key (raw file S3 key)
  type: image_resize | thumbnail | pdf_extract | video_transcode | csv_import | ocr
  status: queued | processing | completed | failed
  progress_percent (0–100)
  output_keys (JSON array of result S3 keys)
  error_message (if failed)
  metadata (JSON — dimensions, page_count, row_count, etc.)
  created_at, started_at, completed_at
```

---

## 2. Image Processing

**Library:** `sharp` (Node.js) / `Pillow` (Python)

### Resize + Thumbnail Pattern

```ts
// src/jobs/image-processing.processor.ts
import sharp from 'sharp';

const THUMBNAIL_CONFIGS = {
  sm: { width: 150, height: 150 },
  md: { width: 400, height: 400 },
  lg: { width: 800, height: 800 },
} as const;

async processImage(job: Job<{ jobId: string; inputKey: string; operations: ImageOp[] }>) {
  const raw = await this.storage.download(job.data.inputKey);
  const outputKeys: string[] = [];

  for (const op of job.data.operations) {
    if (op.type === 'resize') {
      const buffer = await sharp(raw)
        .resize(op.width, op.height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `processed/${job.data.jobId}/${op.size}.webp`;
      await this.storage.uploadPrivate(key, buffer, 'image/webp');
      outputKeys.push(key);
    }

    if (op.type === 'watermark') {
      const watermark = await this.storage.download('assets/watermark.png');
      const buffer = await sharp(raw)
        .composite([{ input: watermark, gravity: 'southeast', blend: 'over' }])
        .jpeg({ quality: 90 })
        .toBuffer();

      const key = `processed/${job.data.jobId}/watermarked.jpg`;
      await this.storage.uploadPrivate(key, buffer, 'image/jpeg');
      outputKeys.push(key);
    }
  }

  await this.updateJob(job.data.jobId, { status: 'completed', outputKeys });
}
```

### Validation Before Processing

```ts
// Server-side image validation (never trust client)
async validateImage(buffer: Buffer): Promise<void> {
  const metadata = await sharp(buffer).metadata();

  const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'gif'];
  if (!ALLOWED_FORMATS.includes(metadata.format ?? '')) {
    throw new BadRequestException(`Unsupported format: ${metadata.format}`);
  }

  const MAX_DIMENSION = 8000;
  if ((metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION) {
    throw new BadRequestException('Image dimensions too large');
  }
}
```

---

## 3. PDF Processing

**Library:** `pdf-parse` or `pdfjs-dist` (Node.js) / `pypdf` (Python)

### Extract Text for RAG / Search

```ts
// src/jobs/pdf-processing.processor.ts
import pdfParse from 'pdf-parse';

async extractText(job: Job<{ jobId: string; inputKey: string }>) {
  const buffer = await this.storage.download(job.data.inputKey);
  const result = await pdfParse(buffer);

  const extracted = {
    text: result.text,
    pageCount: result.numpages,
    info: result.info,         // Title, Author, etc.
    metadata: result.metadata,
  };

  // Store extracted text for search/RAG indexing
  await this.updateJob(job.data.jobId, {
    status: 'completed',
    metadata: { pageCount: result.numpages, wordCount: result.text.split(/\s+/).length },
  });

  // Trigger embedding generation if RAG is enabled
  if (this.config.ragEnabled) {
    await this.llmQueue.add('embed-document', {
      documentId: job.data.jobId,
      text: result.text,
    });
  }
}
```

### Generate PDF (server-side)

**Library:** `@react-pdf/renderer` (Node.js) / `weasyprint` (Python)

```ts
// src/modules/documents/pdf-generator.service.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDocument } from './templates/invoice.template';

export class PDFGeneratorService {
  async generateInvoice(invoiceData: InvoiceData): Promise<Buffer> {
    const element = React.createElement(InvoiceDocument, { invoice: invoiceData });
    return renderToBuffer(element);
  }
}
```

---

## 4. Video Processing

**Library:** `fluent-ffmpeg` (Node.js, requires ffmpeg binary)

**Important:** Never run ffmpeg on the API server. Run it in the Worker service in a container with ffmpeg installed.

### Extract Thumbnail

```ts
// src/jobs/video-processing.processor.ts
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

async extractThumbnail(inputPath: string, outputPath: string, timestamp = '00:00:05'): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: 'thumbnail.jpg',
        folder: path.dirname(outputPath),
        size: '640x?',  // maintain aspect ratio
      })
      .on('end', resolve)
      .on('error', reject);
  });
}
```

### Transcode Video

```ts
async transcodeVideo(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-crf 22',          // quality level (lower = better, larger file)
        '-preset fast',
        '-c:a aac',
        '-movflags +faststart',  // enable streaming before full download
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        // Update job.progress_percent
        this.updateProgress(job.id, Math.round(progress.percent ?? 0));
      })
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}
```

### Dockerfile — Worker with ffmpeg

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg
# ... rest of worker Dockerfile
```

---

## 5. CSV / Excel Import

**Library:** `csv-parse` (Node.js) / `pandas` (Python)

### Pattern: Validate First, Process in Batches

```ts
// src/jobs/csv-import.processor.ts
import { parse } from 'csv-parse';

async processCSVImport(job: Job<{ jobId: string; inputKey: string; type: string }>) {
  const buffer = await this.storage.download(job.data.inputKey);

  const records: ParsedRow[] = [];
  const errors: ImportError[] = [];
  let rowNumber = 0;

  const parser = parse(buffer, {
    columns: true,           // use first row as headers
    skip_empty_lines: true,
    trim: true,
  });

  for await (const row of parser) {
    rowNumber++;
    const validation = this.validateRow(row, rowNumber);

    if (validation.errors.length > 0) {
      errors.push(...validation.errors);
    } else {
      records.push(validation.parsed);
    }

    // Update progress every 100 rows
    if (rowNumber % 100 === 0) {
      await this.updateProgress(job.data.jobId, rowNumber);
    }
  }

  // Fail if too many errors
  const errorRate = errors.length / rowNumber;
  if (errorRate > 0.1) {  // more than 10% rows invalid
    await this.updateJob(job.data.jobId, {
      status: 'failed',
      metadata: { totalRows: rowNumber, errorCount: errors.length, errors: errors.slice(0, 50) },
    });
    return;
  }

  // Insert in batches of 500
  for (const batch of chunk(records, 500)) {
    await this.repository.insertBatch(batch);
    await this.updateProgress(job.data.jobId, rowNumber);
  }

  await this.updateJob(job.data.jobId, {
    status: 'completed',
    metadata: { importedRows: records.length, errorCount: errors.length },
  });
}
```

### Import Validation

```ts
private validateRow(row: Record<string, string>, rowNumber: number): RowValidationResult {
  const errors: ImportError[] = [];
  const parsed: Partial<ParsedRow> = {};

  // Required fields
  if (!row.email) {
    errors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
  } else if (!isEmail(row.email)) {
    errors.push({ row: rowNumber, field: 'email', message: `Invalid email: ${row.email}` });
  } else {
    parsed.email = row.email.toLowerCase();
  }

  // Optional with default
  parsed.role = row.role || 'member';
  if (!['member', 'admin'].includes(parsed.role)) {
    errors.push({ row: rowNumber, field: 'role', message: `Invalid role: ${row.role}` });
  }

  return { errors, parsed: parsed as ParsedRow };
}
```

---

## 6. Document AI / OCR

**Library:** `tesseract.js` (Node.js) / `pytesseract` + `Pillow` (Python)

**Important:** OCR accuracy depends heavily on image pre-processing. Always pre-process before running OCR.

### Pre-processing Pipeline

```ts
// src/jobs/ocr.processor.ts
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async processOCR(job: Job<{ jobId: string; inputKey: string; language?: string }>) {
  const raw = await this.storage.download(job.data.inputKey);

  // Pre-process: grayscale + contrast enhancement
  const preprocessed = await sharp(raw)
    .grayscale()
    .normalise()           // auto-contrast
    .sharpen()             // improve text edges
    .toBuffer();

  const { data } = await Tesseract.recognize(preprocessed, job.data.language ?? 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        this.updateProgress(job.data.jobId, Math.round(m.progress * 100));
      }
    },
  });

  const extracted = {
    text: data.text,
    confidence: data.confidence,  // 0–100
    words: data.words.map(w => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    })),
  };

  await this.updateJob(job.data.jobId, {
    status: 'completed',
    metadata: {
      wordCount: data.words.length,
      confidence: data.confidence,
      language: job.data.language ?? 'eng',
    },
  });

  // Trigger RAG indexing if enabled
  if (this.config.ragEnabled && data.text.trim().length > 50) {
    await this.llmQueue.add('embed-document', {
      documentId: job.data.jobId,
      text: data.text,
    });
  }
}
```

### Supported Input Formats

| Format | Support | Notes |
|---|---|---|
| JPEG / PNG | ✅ Full | Best accuracy with high-contrast text |
| TIFF | ✅ Full | Common in scanned document workflows |
| PDF (image-based) | ✅ Via sharp/pdf-to-image | Convert pages to PNG first |
| Handwriting | ⚠️ Partial | Use `tesseract.js` with `--psm 6`; low confidence expected |
| Multi-language | ✅ | Pass `language: 'eng+deu'` for mixed-language documents |

### Multi-language and Layout Modes

```ts
// Page segmentation modes (psm) for different document types
const PSM_MODES = {
  auto: '3',          // default — automatic page layout analysis
  singleBlock: '6',   // single uniform block of text
  singleLine: '7',    // single text line
  sparse: '11',       // sparse text (receipts, forms with labels)
} as const;

// Example: receipt or form processing
await Tesseract.recognize(preprocessed, 'eng', {
  tessedit_pageseg_mode: PSM_MODES.sparse,
});
```

### Entity: OCR Result Storage

Store extracted text alongside the original file for downstream search and RAG:

```
FileProcessingJob.metadata (JSON)
  wordCount: number
  confidence: number          // average confidence across words
  language: string
  // full text stored in separate Document entity if RAG-enabled
```

---

## 7. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| POST | /files/upload | ✅ | Upload raw file → start processing job |
| GET | /files/:id/status | ✅ | Check processing status + progress |
| GET | /files/:id/outputs | ✅ | Get signed URLs for output files |
| DELETE | /files/:id | ✅ | Delete file + outputs from S3 |
| POST | /imports/csv | ✅ | Upload CSV for import |
| GET | /imports/:id/result | ✅ | Import result: row count + error report |

---

## 8. Progress SSE Endpoint

```ts
@Get(':id/progress')
@Sse()
progress(@Param('id') id: string, @CurrentUser() user: User): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    const interval = setInterval(async () => {
      const job = await this.processingJobsService.findById(id, user.id);

      subscriber.next({ data: {
        status: job.status,
        progress: job.progress_percent,
        outputKeys: job.output_keys,
      }});

      if (['completed', 'failed'].includes(job.status)) {
        subscriber.complete();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  });
}
```

---

## 9. Environment Variables

```bash
# Processing limits
MAX_IMAGE_SIZE_MB=20
MAX_VIDEO_SIZE_MB=500
MAX_PDF_SIZE_MB=50
MAX_CSV_SIZE_MB=25
MAX_IMPORT_ERROR_RATE=0.10   # 10% threshold

# FFmpeg (worker only)
FFMPEG_PATH=/usr/bin/ffmpeg   # set automatically in Docker
VIDEO_TRANSCODE_CRF=22
VIDEO_PRESET=fast
THUMBNAIL_TIMESTAMP=5         # seconds into video

# Processing queues
IMAGE_PROCESSING_QUEUE=image-processing
VIDEO_PROCESSING_QUEUE=video-processing
PDF_PROCESSING_QUEUE=pdf-processing
CSV_IMPORT_QUEUE=csv-import
```

---

## 10. Security Rules

- Validate file type **server-side by reading magic bytes**, not just mime type header
- Never execute uploaded files — PDFs with JavaScript, SVGs with scripts, etc.
- Quarantine uploaded files in a separate S3 prefix until validation is complete
- Scan for malware if processing user-uploaded documents (ClamAV or third-party API)
- Kill ffmpeg processes after timeout (max 10 minutes)
- Strip EXIF data from images before serving (location, device info)
- CSV imports: sanitize all fields for formula injection (`=CMD(...)` in Excel)

```ts
// Magic byte validation
const MAGIC_BYTES: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]),  // %PDF
};

function validateMagicBytes(buffer: Buffer, expectedMime: string): boolean {
  const magic = MAGIC_BYTES[expectedMime];
  if (!magic) return false;
  return buffer.subarray(0, magic.length).equals(magic);
}
```

---

## 11. Edge Cases

| Scenario | Handling |
|---|---|
| File upload interrupted mid-stream | S3 multipart upload — abort incomplete parts via lifecycle policy |
| Processing job crashes mid-video | Job marked failed; user can retry; temp files cleaned up |
| CSV with BOM (Excel exports) | `csv-parse` `bom: true` option strips BOM |
| Corrupted PDF | `pdf-parse` throws; catch and mark job as failed with user-friendly message |
| Image with invalid EXIF | `sharp` ignores EXIF automatically |
| Video too long (>4h) | Reject at upload time; check duration before enqueueing |
| Concurrent imports by same user | Limit to 1 active import per user per entity type |
| OCR confidence too low (<40%) | Mark job as `completed` with `lowConfidence: true`; surface warning to user |
| OCR on non-text image (photo, diagram) | Return empty text with confidence 0; do not enqueue for RAG |

---

## 12. File Structure

```
src/
├── jobs/
│   ├── image-processing.processor.ts
│   ├── pdf-processing.processor.ts
│   ├── video-processing.processor.ts
│   ├── csv-import.processor.ts
│   └── ocr.processor.ts
├── modules/
│   ├── files/
│   │   ├── files.module.ts
│   │   ├── files.controller.ts
│   │   ├── files.service.ts
│   │   └── dto/
│   │       ├── upload-file.dto.ts
│   │       └── processing-job-status.dto.ts
│   └── imports/
│       ├── imports.module.ts
│       ├── imports.controller.ts
│       └── imports.service.ts
├── integrations/
│   └── storage/
│       ├── storage.adapter.ts       ← interface
│       └── s3.adapter.ts            ← implementation
└── entities/
    └── file-processing-job.entity.ts
```
