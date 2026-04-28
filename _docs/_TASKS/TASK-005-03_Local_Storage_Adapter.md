# TASK-005-03: Local Storage Adapter
# FileName: TASK-005-03_Local_Storage_Adapter.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Small  
**Dependencies:** TASK-005-02  
**Status:** Done (2026-01-28)  

---

## Overview

Implement local filesystem storage for media. Used as default in dev and simple deployments.

## Storage Rules

- Root directory: `MEDIA_DIR` (default `/data/media` or `./data/media`).
- Public URL: `MEDIA_BASE_URL` (optional) else `/media`.
- Key format: `YYYY/MM/<uuid>.<ext>`.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/media/storage/local.ts` | implement `put`, `delete`, `getPublicUrl` | ensure directory exists |
| `core/services/media/storage/index.ts` | ensure local is default | `MEDIA_DRIVER=local` |

## Code Sketch

```ts
const key = `${year}/${month}/${crypto.randomUUID()}.${ext}`;
await mkdir(dirname(path), { recursive: true });
await writeFile(path, buffer);
return { key, url: `${baseUrl}/${key}` };
```

## Tests

- `tests/unit/media/localAdapter.test.ts`
  - writes file to disk
  - returns URL with base
  - delete removes file

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
