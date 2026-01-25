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

### TASK-005-1: Storage adapter interface

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

### TASK-005-2: Local storage implementation

**Status:** To Do

Example (pseudo):

```ts
const key = `${yyyy}/${mm}/${uuid}.${ext}`;
await writeFile(join(MEDIA_DIR, key), fileBuffer);
return { key, url: `/media/${key}` };
```

---

### TASK-005-3: Upload endpoint

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
