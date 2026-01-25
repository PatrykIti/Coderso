# TASK-005: Media Storage and Uploads
# FileName: TASK-005_Media_Storage_and_Uploads.md

**Priority:** Medium
**Category:** CMS/Media
**Estimated Effort:** Medium
**Dependencies:** TASK-004
**Status:** To Do

---

## Overview

Implement media upload pipeline with local storage as default and adapters for
S3/Azure. Provide metadata storage and admin API endpoints.

**Goals:**
- Adapter interface with local, S3, Azure implementations.
- Upload validation (size + MIME).
- Media table integration.
- Config via env vars from `MEDIA_SPEC.md`.

---

## Architecture

```
core/services/media/
  storage/
    adapter.ts
    local.ts
    s3.ts
    azure.ts
  mediaService.ts
core/server/routes/
  mediaRoutes.ts
core/server/validation/
  mediaSchemas.ts

tests/unit/media/
  localAdapter.test.ts
  mediaService.test.ts
```

---

## Sub-Tasks

### TASK-005-01_Storage_adapter_interface

**Status:** To Do

Example:

```ts
export interface MediaStorageAdapter {
  put(file: File): Promise<{ key: string; url: string }>;
  get(key: string): Promise<ReadableStream>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/media/storage/adapter.ts` | adapter interface |

---

### TASK-005-02_Local_storage_implementation

**Status:** To Do

Example (pseudo):

```ts
const key = `${yyyy}/${mm}/${uuid}.${ext}`;
await writeFile(join(MEDIA_DIR, key), fileBuffer);
return { key, url: `/media/${key}` };
```

Config:
- `MEDIA_DIR` (default `/data/media`)
- `MEDIA_BASE_URL` (optional CDN)

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/media/storage/local.ts` | local adapter |
| `core/services/media/mediaService.ts` | store metadata |

---

### TASK-005-03_S3_storage_implementation

**Status:** To Do

Notes:
- Bucket + prefix per environment.
- Public URL via CDN or signed URLs (configurable).

Env:
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`

Example (pseudo):

```ts
await s3.putObject({ Bucket: bucket, Key: key, Body: fileBuffer, ContentType: mime });
return { key, url: `https://${cdnHost}/${key}` };
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/media/storage/s3.ts` | S3 adapter |

---

### TASK-005-04_Azure_storage_implementation

**Status:** To Do

Notes:
- Container per environment.
- Public URL via CDN or blob URL (configurable).

Env:
- `AZURE_CONTAINER`, `AZURE_ACCOUNT`, `AZURE_KEY`

Example (pseudo):

```ts
await blobClient.uploadData(fileBuffer, { blobHTTPHeaders: { blobContentType: mime } });
return { key, url: `${cdnHost}/${key}` };
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/media/storage/azure.ts` | Azure adapter |

---

### TASK-005-05_Upload_endpoint

**Status:** To Do

Endpoint:
- `POST /media` (multipart)

Validation:
- size limit
- MIME whitelist
- Optional AV scan (plugin hook)

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/mediaRoutes.ts` | upload + CRUD endpoints |
| `core/server/validation/mediaSchemas.ts` | request validation |

---

## Testing Requirements

- [ ] `tests/unit/media/localAdapter.test.ts` writes file and returns URL.
- [ ] `tests/unit/media/mediaService.test.ts` creates DB record.
- [ ] `tests/integration/routes/media.test.ts` validates upload endpoint.
- [ ] `tests/integration/routes/media.test.ts` rejects disallowed MIME.

---

## New Files to Create

- `core/services/media/storage/adapter.ts`
- `core/services/media/storage/local.ts`
- `core/services/media/storage/s3.ts`
- `core/services/media/storage/azure.ts`
- `core/services/media/mediaService.ts`
- `core/server/routes/mediaRoutes.ts`
- `core/server/validation/mediaSchemas.ts`
- `tests/unit/media/localAdapter.test.ts`
- `tests/unit/media/mediaService.test.ts`
- `tests/integration/routes/media.test.ts`

---

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` (adapter API and storage notes).
- `_docs/CMS_API.md` (upload endpoint behavior).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
- Notes: adapters, upload pipeline, media API.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md` (upload security).
