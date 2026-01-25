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

## Commands (if needed)

No new dependencies.

---

## Sub-Tasks

### TASK-005-00_Media_table_schema

**Status:** To Do

Define `media` table aligned with `DATA_MODEL.md`.

Schema sketch:

```ts
export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  title: text("title"),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});
```

Notes:
- `key` stores adapter storage key for delete/lookup.
- If we decide to avoid `key`, update `DATA_MODEL.md` accordingly.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | media table |
| `core/db/migrations/*` | migration files |

---

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

Adapter rules:
- `put` returns storage key and public URL.
- `getPublicUrl` is deterministic and does not perform I/O.
- `key` must be safe for URLs (no spaces).

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

Local adapter sketch:

```ts
export async function put(file: File) {
  const key = buildKey(file.name);
  await writeFile(join(MEDIA_DIR, key), await file.arrayBuffer());
  return { key, url: `${BASE_URL}/media/${key}` };
}
```
Config:
- `MEDIA_DIR` (default `/data/media`)
- `MEDIA_BASE_URL` (optional CDN)

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/media/storage/local.ts` | local adapter |
| `core/services/media/mediaService.ts` | store metadata |

Media service sketch:

```ts
export async function upload(file: File) {
  const stored = await adapter.put(file);
  const [row] = await db.insert(media).values({
    key: stored.key,
    url: stored.url,
    title: file.name,
    mimeType: file.type,
    type: file.type.startsWith("image/") ? "image" : "file",
    size: file.size,
  }).returning();
  return row;
}
```

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

S3 adapter sketch:

```ts
await s3.putObject({ Bucket: bucket, Key: key, Body: buffer, ContentType: mime });
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

Azure adapter sketch:

```ts
await blobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mime } });
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

Route sketch:

```ts
router.post("/media", requirePermission("media:write"), async (req) => {
  const file = await parseMultipart(req);
  const saved = await mediaService.upload(file);
  return json(saved);
});
```

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

Test sketch (mediaService.test.ts):

```ts
it("stores media metadata", async () => {
  const item = await upload(fakeFile("photo.jpg", "image/jpeg"));
  expect(item.url).toContain("/media/");
});
```

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
