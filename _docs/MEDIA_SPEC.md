# Media Storage Spec (v1)

## Default

- Storage lokalny w core (filesystem) - v1.
- Publiczne serwowanie plikow przez core.
- V1 wspiera adaptery: local, S3, Azure.
- `media.key` przechowuje storage key do usuwania i przenoszenia plikow.

## Local storage

- Katalog: `MEDIA_DIR` (default `./storage/media`, np. `/data/media`).
- Publiczny adres media jest zawsze stabilna trasa proxy
  `/media/<encoded-storage-key>`. `MEDIA_BASE_URL` ani URL zwrocony przez adapter
  nie sa publiczna projekcja rekordu media.
- Struktura nowych kluczy: `<yyyy>/<mm>/<uuid>.<ext>` (klucz wzgledny, bez wiodacego
  `/`), gdzie rozszerzenie jest
  kanonicznym wynikiem inspekcji bajtow, a nie pochodna nazwy pliku.
- TASK-536 nie deklaruje dodatkowego `Cache-Control`; cache policy pozostaje
  jawnie nieokreslona do czasu osobnego kontraktu z testami GET/HEAD dla trybu
  public i internal.

## External storage (adapter)

Konfiguracja (runtime z panelu admina):
- `MEDIA_STORAGE=local|s3|azure`
- `MEDIA_BASE_URL=https://cdn.example.com` (opcjonalnie)
- `MEDIA_MAX_SIZE_BYTES=10485760` (opcjonalnie, domyslnie 10MB)
- `MEDIA_ALLOWED_MIME=image/*,application/pdf` (opcjonalnie)

S3 (przyklad):
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `S3_PREFIX` (opcjonalnie)
- `S3_ENDPOINT` (opcjonalnie, kompatybilne S3 / custom origin)

Azure (przyklad):
- `AZURE_CONTAINER`, `AZURE_ACCOUNT`, `AZURE_KEY`
- `AZURE_STORAGE_CONNECTION_STRING` (alternatywa dla konta + klucza)

Adapter interface (concept):
- `put(file)` / `getPublicUrl(key)` pozostaja ogolnym kontraktem uzywanym m.in.
  przez backupy;
- upload rekordu media uzywa `putMedia({ bytes, identity, downloadName })`, gdzie
  `identity` jest juz kanonicznym wynikiem inspekcji bajtow;
- `get(key)` -> stream;
- `delete(key)` -> void.

Adapter moze ustawic MIME/disposition obiektu remote przy zapisie jako
defense-in-depth, ale domena media ignoruje provider URL. Finalny GET/HEAD jest
proxyowany przez core i nie ufa ani nie wymaga metadanych providera.

Uwaga:
- Sekrety storage przechowywane sa zaszyfrowane w DB.
- Do odszyfrowania wymagany jest `MEDIA_SECRET_MASTER_KEY` (ENV) ustawiony na serwerze.
- Klucz ma 32 bajty (hex 64 znaki / base64 32 bajty / 32 znaki ASCII).
- Po rotacji klucza trzeba ponownie zapisac sekrety w Admin UI.
  Szczegoly: `_docs/SECURITY_SPEC.md`.

Backup artefakty (remote):
- Backupy (TASK-511, v2) **reużywaja tych samych driverow storage** przez
  `getMediaStorageAdapter()`: gdy schedule ma `storageDriver` `s3`/`azure`,
  artefakt `.cbk` (skompresowany + zaszyfrowany archiwum) jest uploadowany tym
  samym adapterem (`put` → `{ url, key }`), a publiczny URL trafia do
  `backups.artifact_path`, natomiast klucz obiektu do server-internal
  `backups.artifact_key` (uzywany do `delete` przy retencji). Legacy v1 `.json`
  artefakty pozostaja czytelne przez ten sam kontrakt.
- Credentiale storage sa czytane wylacznie backend-only
  (`getStorageSettingsInternal()`) i nigdy nie sa zapisywane do artefaktu,
  logow ani odpowiedzi klienta.
- Od v2 backup artefakt **archiwizuje bajty plikow mediow** (membery `media/*`
  streamowane do `.cbk`), a Import odtwarza je po commicie transakcji DB —
  dlatego obowiazuje opt-in maintenance mode i streamed-upload ceilings
  (`BACKUP_IMPORT_MAX_BYTES` / `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES`).
  Bajty mediow nigdy nie sa pobierane z URL przy restore; podrozuja w
  zaszyfrowanym archiwum.

## Upload rules

- Max size per file (config: `MEDIA_MAX_SIZE_BYTES`).
- Dozwolone MIME types (whitelist: `MEDIA_ALLOWED_MIME`) sa sprawdzane wzgledem
  kanonicznego MIME ustalonego z bajtow. Deklarowany `Content-Type`, nazwa i
  rozszerzenie sa tylko niezaufanymi danymi wejsciowymi.
- Metadane: alt, title, caption.
- Dla uploadow i replace obrazow serwis media probuje zapisac `width` i `height`
  w rekordzie `media`. Parser jest bounded i nie dekoduje pikseli; wspiera PNG,
  JPEG, GIF i WebP.
- Jesli `title` nie zostanie podany przy uploadzie, domyslnie przyjmuje
  oryginalna nazwe pliku. `originalName` pozostaje read-only identity.

Ten sam kontrakt obowiazuje dla create i replace. Oryginalna nazwa moze byc
display/download metadata, ale nigdy nie wybiera storage-key extension, response
MIME ani inline delivery.

### Canonical byte identity and delivery

`CANONICAL_MEDIA_PROFILES` jest jedynym ownerem relacji MIME -> extension ->
delivery:

| Canonical MIME | Extension | Delivery |
|---|---|---|
| `image/png` | `.png` | `inline` |
| `image/jpeg` | `.jpg` | `inline` |
| `image/gif` | `.gif` | `inline` |
| `image/webp` | `.webp` | `inline` |
| `image/bmp` | `.bmp` | `inline` |
| `application/pdf` | `.pdf` | `attachment` |
| `text/plain` | `.txt` | `attachment` |
| `image/svg+xml` | `.svg` | `attachment` |
| `application/octet-stream` | `.bin` | `attachment` |

- Passive raster images may be inline only when persisted MIME, canonical key
  extension, and inspected object prefix agree.
- Strict UTF-8 plain text and safe standalone SVG remain attachment-only.
  Malformed/active markup, conflicting signatures, truncated signatures, and
  polyglot input fail before storage/DB.
- PDF is an attachment-only, inspectable safe subset. Benign compressed page-content
  streams remain supported, while active forms/XFA, encryption, and compressed object
  streams fail before storage because they can hide executable/action structures from
  the bounded lexical inspection.
- SVG requires exact `image/svg+xml` authorization in the effective global
  policy and, for a Form field, its `accept` list; `image/*` alone is not explicit
  authorization for an active-capable format.
- Unknown binary bytes canonicalize to octet-stream only when the effective
  upload policy explicitly allows `application/octet-stream`; a wildcard or
  filename cannot authorize them.
- Every successful local/S3/Azure `GET` and `HEAD` returns the final core response
  with server-owned `Content-Type`, safe `Content-Disposition`, and
  `X-Content-Type-Options: nosniff`. `HEAD` includes exact persisted
  `Content-Length`; asynchronous `GET` remains provider-neutral and streamed, so Bun
  may use chunked framing. If Bun synthesizes a GET length, it must equal the persisted
  size. Remote delivery never redirects the client to a provider URL.
- A legacy persisted MIME/key mismatch, or a passive-inline row whose byte prefix
  does not confirm the claimed raster type, is served as
  `application/octet-stream` attachment with a safe `.bin` filename. Canonical
  PDF/SVG/text/octet MIME+extension pairs remain attachments regardless of their
  prefix; the delivery seam does not claim full classification for those formats.

## Folders, tags, focal point & richer metadata (TASK-512)

The media model is organized + enriched beyond the base `alt/title/caption`:

### Folders / collections (`media_folders`)

- Real user-defined folders (`media_folders`: `id, name, slug, parent_id,
  order_index, created_at, created_by`), separate from the type-based rail.
- **Nesting:** `parent_id` self-references `media_folders.id`
  (`onDelete: set null`), so deleting a parent un-parents its children rather
  than cascade-deleting them.
- **Slug uniqueness:** enforced at the DB (unique index `media_folders_slug_idx`)
  AND service-side; a duplicate slug is rejected `media_folder_slug_conflict`
  (409).
  The normal service precheck provides deterministic feedback, while the DB
  constraint remains authoritative for concurrent create and update writes.
  Only PostgreSQL `23505` paired with the exact owned constraint name (directly
  or in the supported bounded `cause` shape) maps to that domain error. Other
  constraints/errors retain their original failure path, and the fixed 409
  response exposes no PostgreSQL code, constraint, SQL, stack, or raw details.
- **Ordering:** `order_index` (default 0) orders siblings; reorder is a
  `media:write` operation.
- **Membership:** `media.folder_id` (nullable, `onDelete: set null`). **Deleting
  a folder NEVER deletes its assets** — member assets have `folder_id` set to
  null and return to "All files". Filtering the grid by folder is a client read.
- Folder CRUD/reorder rides new routes registered from inside
  `registerMediaRoutes` (no `routes/index.ts` edit), all behind `media:read`
  (reads) / `media:write` (writes); `GET /media/folders` is registered BEFORE
  `GET /media/:id` for correct first-match dispatch.

### Tags

- `media.tags` (jsonb `string[]`, NOT NULL DEFAULT `'[]'`) — free-form labels
  (mirrors `content_entries.tags`/`posts.tags`). Tag count + per-tag length are
  capped server-side; the value is normalized (trim/dedupe/reject non-string)
  before write. Filter-by-tag is a client read over the loaded list.

### Focal point

- `media.focal_x` / `media.focal_y` (real, nullable) — normalized `0..1`
  coordinates driving image crop/`object-position` focus. Out-of-range values are
  **clamped to `[0,1]`** service-side (not rejected). Both null = center default;
  a legacy row reads byte-identical.

### Richer metadata

- `media.description` (long-form, distinct from `caption`) and `media.credit`
  (attribution line) — both `text`, nullable, present-only round-trip.

### Storage quota (settings, not schema)

- Quota lives in the `settings` key/value store (NO DDL):
  `storage.quota.totalBytes` (number|null — null = unlimited/no bar) and
  `storage.quota.planLabel` (string|null). Written via `PATCH /settings/storage`,
  which validates a nested `quota` object (`additionalProperties:false`,
  `totalBytes` number|null, `planLabel` string|null) in `storageSettingsSchema`.
- The admin storage card computes `usedBytes = Σ media.size` (client-side) against
  the configured quota and renders a progress bar + "% used" / "available" footer
  + "Manage plan". **Unset quota degrades gracefully** to the count-only card (no
  bar) so no-quota installs see no regression.
- Quota is **advisory/display by default**; enforcement (reject upload with
  `media_quota_exceeded` 413 when `usedBytes + incoming > quota`) is opt-in so
  existing installs are never locked out.

### Validation contract (reject-unknown / present-only / clamp)

- Every new validated payload key has a JSON-schema entry with
  `additionalProperties:false` (`mediaSchemas.ts`) plus a service-side `normalize*`
  (reject/omit unknown; clamp/validate). Unknown keys are rejected 4xx
  (`validation_error`) at the route edge.
- Media update is **present-only** (`hasOwnProperty` gating in `buildMediaPatch`)
  — an omitted key is never written, so siblings survive a partial PATCH.
- Upload body rejects `folderId`/`tags` (assignment/tagging is a PATCH, not an
  upload key).

## Assistant avatar assets (TASK-101-06)

- Assistant floating launcher supports optional avatar asset URL (`assistant.launcher.avatarAsset`).
- Recommended formats:
  - 3D: `.glb` / `.gltf` (rendered as optional enhanced mode, never required)
  - 2D fallback: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`
  - Motion fallback: `.mp4`, `.webm`, `.ogg`
- If the launcher cannot render the configured asset directly, UI falls back to the default launcher surface.
- Avatar failures must never block assistant chat interaction.

## Content fields (entry data)

Media fields w Content Types przechowuja **ID assetu**:

Single:
```json
{ "hero-image": "media-id-123" }
```

Multi:
```json
{ "gallery": ["media-id-1", "media-id-2"] }
```

`media.accept` i `media.maxItems` sa konfigurowane w schema meta (`xFieldConfig`).

Pola oznaczone `xFieldType: "media"` zawsze przechowuja ID assetu z biblioteki
mediow. Zewnetrzne URL-e, nawet z backendowego profilu kuratorowanych mediow,
nie moga byc zapisywane w takich polach. Jesli blueprint potrzebuje
bezpiecznego publicznego obrazu bez uploadu, musi uzyc osobnego pola tekstowego,
np. `coverImageUrl`, i udokumentowac zrodlo/licencje obok niego. Asystent moze
dobierac takie URL-e tylko przez zaufany katalog/profil mediow po stronie
backendu; prompt uzytkownika ani provider nie moga dostarczyc dowolnego URL-a do
pola obrazka.

Curated assistant media profile selection must require a business
industry/vertical match before theme keywords can influence ranking. Broad theme
terms such as booking, gallery, portfolio, or premium may rank already-matched
profiles, but they must not select an unrelated industry profile by themselves.

## Assistant reference intake

Advanced assistant reference intake treats media as design evidence only. It may
use existing media-library ids after backend permission/read checks, and
temporary reference ids only after scan/type/size validation. Arbitrary remote
media URLs are unsupported unless a backend-owned trusted adapter is introduced
for that source.

Before reference evidence can influence assistant facts or provider context,
the backend redacts filenames, EXIF/metadata, OCR/extracted text, alt text,
signed URLs, cookies, tokens, and secret-like values. Provider prompts and
diagnostics receive only bounded text facts, digests, and `rawIncluded:false`;
raw bytes, signed URLs, raw metadata, and raw reference ids must not be stored
in browser state or sent to a provider.

Reference design briefs may use sanitized media evidence only as reviewed visual
hints. They do not import remote media, create media-library assets, or carry
raw file bytes/text into provider prompts or action execution.

## Admin UI behavior (v1)

- Prototype-faithful shell (TASK-512): storage **quota** progress card
  (data-backed, degrades to count-only when no quota), a "Filters" affordance
  (tag/type/folder facets), grid cards with a top-left absolute type badge overlay
  (`absolute left-2 top-2 bg-card/80 backdrop-blur`) + a static in-flow tone chip
  in the footer row, aspect-square previews, and a real user **folder rail**
  alongside the type-based rail.
- Folder list failures preserve the last good nested tree and expose a visible,
  accessible alert with a retry action. Create/rename failure keeps the exact
  form generation, target, draft, and input focus; reorder keeps the visible
  order; delete keeps selection and both folder-filter owners. Controls expose
  disabled/`aria-busy` pending state, and a form closes only after the matching
  still-current operation succeeds. A failed retry remains retryable with a new
  error token instead of dismissing user state.
- Every `media:folders` cache event reconciles through a forced server GET.
  An event overlapping manual load Retry is queued and forced after that Retry
  settles; stale/unmounted loads cannot overwrite a newer mutation result or
  replace the last good tree.
- Upload dropzone + manual browse.
- Wyszukiwarka po nazwie i tytule.
- Filtry: all, images, documents, audio; plus folder + tag facet filters
  (TASK-512).
- Panel szczegolow: podglad meta, edycja title/alt/caption, copy link,
  replace asset bez zmiany ID, usage links, file info i wymiary obrazow; oraz
  (TASK-512) przypisanie do folderu, tagi (`TagInput`), focal point
  (`FocalPointPicker`, `0..1` drag marker → `object-position`), description i
  credit.
- Metadata autosave i Copy URL pokazuja wynik operacji (saving/saved/failed,
  copied/failed) oparty o realny wynik async.
- Widok grid/list korzysta z tego samego ownera listy i pokazuje `title`,
  `originalName`, a dopiero potem storage name.
- Obrazy bez alt text pokazuja ostrzezenie accessibility w karcie i details.
- Empty states i loaded counts sa prawdziwe dla aktualnego full-list API; UI nie
  pokazuje martwego `Load More Assets`.
- Multi-select jest stale dostepny na widocznym zakresie assetow bez osobnego
  trybu `Select` i uzywa istniejacych per-asset delete/download sciezek.
- `media.openAfterUpload` jest preference uzytkownika przy upload surface i
  nadal zapisuje sie przez `userSettingsClient`.
- Delete asset wymaga potwierdzenia w UI (v1.1).

## Admin usage read model

- `GET /media/:id/usage` zwraca bounded internal summaries dla miejsc uzycia
  assetu w obecnych wlascicielach danych: pages, content entries, posts,
  commerce products i zapisane Form submissions.
- Upload wykonany przed finalnym submit pozostaje unreferenced. Usage typu
  `submission` powstaje dopiero po skutecznym zapisaniu odpowiedzi zawierajacej
  ID tego media assetu.
- Endpoint wymaga `media:read`. Zwracane `adminHref` wskazuje tylko istniejace
  kanoniczne trasy admina.
- Usage matcher szuka znanych ksztaltow referencji media (`mediaId`, `assetId`,
  `featuredMediaId`, tablice media IDs oraz rich-text `data-media-id`) bez
  broad substring matching.
- Active Post image/gallery/video/audio/file consumers use the shared projected media
  kind. An attachment/document row cannot regain image rendering or picker eligibility
  through a raw `image/*` MIME-prefix check.
- A generic admin `MediaPicker` may deliberately admit an attachment-only SVG only when
  its caller supplies the exact `image/svg+xml` rule. The row remains a document and
  renders/downloads as an attachment; `image/*` alone and the Post image/gallery pickers
  continue to exclude it.

## Admin maintenance actions

- `POST /media/:id/dimensions/recover` wymaga `media:write` i probuje uzupelnic
  wymiary tylko dla istniejacego obrazu bez `width`/`height`.
- `POST /media/:id/replace` wymaga `media:write`, waliduje nowy plik tym samym
  byte-authoritative kontraktem co create, zachowuje ID assetu i aktualizuje
  kanoniczny storage key/proxy URL, oryginalna nazwe, MIME, rozmiar oraz wymiary.

## Security

- Uploady biblioteki mediow pozostaja w admin API (`media:write` + CSRF).
  `POST /forms/:id/uploads` jest osobnym publicznym/internal Forms boundary:
  nie przyznaje `media:write`, re-resolvuje pole `file` i uzywa form-bound
  access/nonce/captcha/rate-limit contract.
- Opcjonalny AV scan jako plugin.
- Media + folder writes stay behind the existing `media:write` RBAC bucket; reads
  behind `media:read` — NO new RBAC bucket, NO loosened auth path. New folder +
  quota client writes carry CSRF (`withCsrf: true`).
- Reject-unknown 4xx on every new validated key (media PATCH + folder routes +
  storage-quota settings); folder-delete un-files (never cascades); focal clamped
  `[0,1]`; tag count + per-tag length capped; quota display-only by default.

Publiczny Forms upload tworzy rekord media przed finalnym submission. Uzytkownik,
ktory zakonczy flow po uploadzie bez wyslania formularza, moze pozostawic
niepowiazany rekord/obiekt. Automatyczny TTL sweep lub pending-submission cleanup
nie jest czescia TASK-536; to jawnie zachowany residual z TASK-516-07, a nie
funkcja uznana za zaimplementowana.
