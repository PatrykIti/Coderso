---
title: "Media Library"
audience: "editor"
productArea: "media"
language: "en"
keywords:
  - media
  - upload
  - image
  - asset
  - media settings
  - metadata
---

# Basic

Media Library is the central asset workspace for images and other uploaded
files. It is where you upload files, search the library, filter by asset type,
open asset details, and control delivery access for runtime `/media/*` URLs.

In the current UI, this screen includes:
- top actions:
  `Media settings` and `Upload New`
- library controls:
  search, type filters, view mode, and `Open details after upload`
- upload area:
  drag-and-drop zone plus `Browse Files`
- asset list/grid:
  the loaded asset set with truthful result counts

# Medium

Use Media Library when you need to:
- upload new images or files,
- find an existing asset instead of uploading a duplicate,
- review or update metadata,
- check delivery access rules,
- reuse the same file across page sections/blocks, posts, forms, and other real
  product surfaces.

The Media surface is easiest to understand as four connected workflows:
- ingestion:
  upload new files by drag-and-drop or file picker
- discovery:
  search and filter the library to locate an existing asset
- asset quality:
  review title, alt text, caption, and file information
- delivery control:
  choose whether runtime media delivery is `public` or `internal`

# Instruction

1. Open `Media` from the main admin navigation.
2. Start at the top of the page and orient yourself.
   Confirm:
   - `Media settings`
   - `Upload New`
   - search field
   - type filters
   - `Open details after upload`
3. If you need to add files, use one of these paths:
   - drag files into the dropzone,
   - click the dropzone,
   - click `Upload New`,
   - click `Browse Files`.
4. Before upload, decide whether `Open details after upload` should be enabled.
   - enable it when you want to review metadata immediately after upload,
   - disable it when you plan to batch-upload several files first.
5. Use the search field when you know part of the asset name, original name, or
   title.
6. Use type filters to narrow the library:
   - `All Files`
   - `Images`
   - `Documents`
   - `Audio`
7. Scan the asset cards in the library and choose an existing file before
   uploading a duplicate.
8. Open asset details when you need to manage one file more carefully.
   In the shipped product contract, the details workflow includes:
   - asset preview,
   - title,
   - alt text,
   - caption,
   - file information,
   - copy/open/delete actions,
   - usage references.
9. In asset details, review metadata in this order:
   - title
   - alt text
   - caption
   - file information such as size, dimensions, MIME type, and upload date
10. Use the action controls as needed:
    - open/preview asset,
    - copy asset URL,
    - download/open asset,
    - delete asset when you are certain it should be removed.
11. Open `Media settings` when you need to control runtime delivery access.
12. In `Media settings`, review `Access mode` carefully:
    - `Public (recommended)`
    - `Internal (session or API key)`
13. Save settings only after you are certain how runtime media access should
    work for the project.

Upload and replace validate the actual bytes. The original filename and the type
reported by the browser are display/input hints only; they do not select the
stored type, storage extension, or browser delivery behavior. If content is
unsafe, ambiguous, or conflicts with the allowed policy, the operation fails
before the asset becomes reusable.

Use this safe working order when you want the fewest mistakes:
1. Search first.
2. Reuse an existing asset if possible.
3. Upload only when needed.
4. Review metadata immediately after upload.
5. Check delivery access settings only when you truly mean to change runtime
   access behavior.

# Advanced

- Treat Media Library as a reusable asset catalog, not a dumping ground.
  Reuse should be the default; duplicate uploads should be the exception.
- Metadata quality matters operationally. Alt text, title, and caption affect
  usability, accessibility, and editorial clarity even when the upload itself
  succeeded.
- `Open details after upload` is useful for quality control when uploading one
  important file, but it can slow down bulk-ingestion flow when you are adding
  many assets.
- Type filters are not just convenience UI. Use them to prevent accidental reuse
  of the wrong asset category.
- New passive PNG, JPEG, GIF, WebP, and BMP assets may render inline. PDF, plain
  text, safe SVG, and explicitly allowed unknown binary assets download as
  attachments. This behavior is server-owned and cannot be changed by renaming
  a file.
- PDF uploads may use ordinary compressed page content, but files with active forms,
  encryption, or compressed object structures are rejected because Coderso cannot
  safely inspect those structures at upload time.
- The admin keeps attachment-only formats such as SVG in the `Documents`
  category. They do not receive image previews, image-only editing controls, or
  eligibility in pickers restricted to passive images, including the image and gallery
  pickers used by the Posts editor. A specialized picker can offer SVG only when it
  explicitly requests the exact `image/svg+xml` type; even then, the asset stays a
  downloadable document rather than becoming an inline image.
- `Internal` delivery mode is a security boundary, not a cosmetic toggle. It
  changes how runtime `/media/*` URLs can be accessed.
- Usage information in asset details helps you think in terms of shared assets.
  Before deleting an item, verify whether other surfaces depend on it.
- Result counts describe the currently loaded full-list response; the UI does
  not expose a nonfunctional `Load More Assets` control.

# Troubleshooting

- You cannot find an asset:
  clear the search field and reset the type filter to `All Files`.
- Upload worked but the file is hard to locate:
  enable `Open details after upload` next time so the new asset opens directly
  into its detail workflow.
- The file exists but the wrong asset is being reused:
  review title/original name and asset type more carefully before inserting it
  into another surface.
- Runtime media links should not be public:
  open `Media settings` and review `Access mode`.
- You are about to delete an asset:
  check usage context first so you do not break another page section/block,
  post, form, or configuration surface.
- Metadata is incomplete after upload:
  open asset details and update title, alt text, and caption before treating the
  file as ready for reuse.

# Decision Guide

- Choose reuse vs upload:
  reuse when the asset already exists and is suitable; upload only when the
  library does not already contain the right file.
- Choose search vs filter:
  use search when you know the name; use filters when you know the asset type
  but not the exact file.
- Choose keep details closed vs open after upload:
  keep details closed for batch uploads; open details after upload for
  metadata-first workflows.
- Choose `Public` vs `Internal` delivery:
  use `Public` for normal open media delivery; use `Internal` when runtime
  access must be restricted to authenticated admin/API-key contexts.
- Choose delete vs keep:
  delete only when you are sure the asset is not needed elsewhere.

# Checklist

1. Confirm the asset does not already exist before uploading.
2. Confirm uploaded files are in the expected type bucket.
3. Confirm title, alt text, and caption are acceptable for reuse.
4. Confirm file information matches expectations.
5. Confirm delivery access mode is intentional.
6. Confirm documents or active-capable formats download instead of rendering
   inline.
7. Confirm the asset is safe to reuse before leaving the library.

# Security

- Media Library is an authenticated admin surface and should only be used by
  signed-in users with the appropriate permissions.
- `Internal` delivery mode blocks anonymous runtime access. Requests must come
  from an authenticated admin session or API key with `media.read`.
- Asset URLs can become reusable runtime references, so treat copied media links
  as operationally meaningful.
- Runtime `/media/*` responses are served through Coderso with a canonical type,
  safe download disposition, and `nosniff`; cloud provider URLs are not exposed
  as an alternate delivery bypass.
- A legacy asset that cannot be safely confirmed for inline display is forced to
  a safe generic download instead.
- Deleting or misconfiguring widely reused assets can break multiple screens at
  once.
