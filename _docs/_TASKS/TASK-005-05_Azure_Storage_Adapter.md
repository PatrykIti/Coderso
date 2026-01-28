# TASK-005-05: Azure Storage Adapter
# FileName: TASK-005-05_Azure_Storage_Adapter.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-02  
**Status:** To Do  

---

## Overview

Implement Azure Blob Storage adapter using `@azure/storage-blob`.

## Documentation Check (Required)

Before implementation, query MCP docs for `@azure/storage-blob` and confirm:
- `BlobServiceClient` creation
- `ContainerClient` usage
- `BlockBlobClient.uploadData` / `uploadStream`
- headers for `blobContentType`

## Environment Variables

- `AZURE_STORAGE_CONNECTION_STRING` **or** (`AZURE_ACCOUNT` + `AZURE_KEY`)
- `AZURE_CONTAINER`
- `MEDIA_BASE_URL` (optional CDN)

## Behavior

- `put(file)` uploads blob with content-type
- `delete(key)` removes blob
- `getPublicUrl(key)` uses `MEDIA_BASE_URL` if present; else container URL

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/media/storage/azure.ts` | implement adapter | Azure SDK |

## Tests

- Mock Azure client; verify upload + delete methods invoked.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
