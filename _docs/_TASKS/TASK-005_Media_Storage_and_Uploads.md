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

---

### TASK-005-02_Local_storage_implementation

**Status:** To Do

Example (pseudo):

```ts
const key = `${yyyy}/${mm}/${uuid}.${ext}`;
await writeFile(join(MEDIA_DIR, key), fileBuffer);
return { key, url: `/media/${key}` };
```

---

### TASK-005-03_S3_storage_implementation

**Status:** To Do

Notes:
- Bucket + prefix per environment.
- Public URL via CDN or signed URLs (configurable).

Example (pseudo):

```ts
await s3.putObject({ Bucket: bucket, Key: key, Body: fileBuffer, ContentType: mime });
return { key, url: `https://${cdnHost}/${key}` };
```

---

### TASK-005-04_Azure_storage_implementation

**Status:** To Do

Notes:
- Container per environment.
- Public URL via CDN or blob URL (configurable).

Example (pseudo):

```ts
await blobClient.uploadData(fileBuffer, { blobHTTPHeaders: { blobContentType: mime } });
return { key, url: `${cdnHost}/${key}` };
```

---

### TASK-005-05_Upload_endpoint

**Status:** To Do

Endpoint:
- `POST /media` (multipart)

Validation:
- size limit
- MIME whitelist

---

## Testing Requirements

- [ ] Upload rejects invalid MIME.
- [ ] Local storage writes file and returns public URL.
- [ ] DB metadata record created.

---

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` (if adapter API changes).
- `_docs/CMS_API.md` (upload endpoint behavior).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
- Notes: adapters, upload pipeline, media API.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md` (upload security).
