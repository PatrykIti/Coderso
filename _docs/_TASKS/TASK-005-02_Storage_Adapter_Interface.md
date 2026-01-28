# TASK-005-02: Storage Adapter Interface
# FileName: TASK-005-02_Storage_Adapter_Interface.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Small  
**Dependencies:** TASK-005-01  
**Status:** To Do  

---

## Overview

Define a storage adapter interface and adapter resolver. This keeps media storage implementation swappable (local/S3/Azure).

## Interface

```ts
export type StoredObject = {
  key: string;
  url: string;
};

export interface MediaStorageAdapter {
  put(file: File): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
```

## Resolver Rules

- `MEDIA_DRIVER=local|s3|azure` selects adapter.
- `MEDIA_BASE_URL` overrides public URL base.
- Keys must be URL‑safe and deterministic.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/media/storage/adapter.ts` | define interface + types | no I/O |
| `core/services/media/storage/index.ts` | resolve adapter by env | throws on unknown driver |

## Tests

- Unit test adapter resolver selection (if implemented).

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
