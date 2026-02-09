# Media Storage Spec (v1)

## Default

- Storage lokalny w core (filesystem) - v1.
- Publiczne serwowanie plikow przez core.
- V1 wspiera adaptery: local, S3, Azure.
- `media.key` przechowuje storage key do usuwania i przenoszenia plikow.

## Local storage

- Katalog: `MEDIA_DIR` (np. `/data/media`).
- URL publiczny: `/media/<path>` (lub `MEDIA_BASE_URL`).
- Struktura sciezek: `/<yyyy>/<mm>/<uuid>.<ext>`.
- Cache-Control: long cache dla niezmiennych plikow.

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
- `put(file)` -> `{ url, key }`
- `get(key)` -> stream
- `delete(key)` -> void
- `getPublicUrl(key)` -> url

Uwaga:
- Sekrety storage przechowywane sa zaszyfrowane w DB.
- Do odszyfrowania wymagany jest `MEDIA_SECRET_MASTER_KEY` (ENV) ustawiony na serwerze.
- Klucz ma 32 bajty (hex 64 znaki / base64 32 bajty / 32 znaki ASCII).
- Po rotacji klucza trzeba ponownie zapisac sekrety w Admin UI.
  Szczegoly: `_docs/SECURITY_SPEC.md`.

## Upload rules

- Max size per file (config: `MEDIA_MAX_SIZE_BYTES`).
- Dozwolone MIME types (whitelist: `MEDIA_ALLOWED_MIME`).
- Metadane: alt, title, caption.

## Assistant avatar assets (TASK-101-06)

- Assistant panel supports optional avatar asset URL (`assistant.ui.avatarAsset`).
- Recommended formats:
  - 3D: `.glb` / `.gltf` (rendered as optional enhanced mode, never required)
  - 2D fallback: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`
  - Motion fallback: `.mp4`, `.webm`, `.ogg`
- If WebGL is unavailable or 3D renderer is not active, UI falls back to 2D placeholder.
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

## Admin UI behavior (v1)

- Upload dropzone + manual browse.
- Wyszukiwarka po nazwie i tytule.
- Filtry: all, images, documents, audio.
- Panel szczegolow: podglad meta, edycja title/alt/caption, copy link.
- Delete asset wymaga potwierdzenia w UI (v1.1).

## Security

- Uploady tylko przez admin API (auth + CSRF).
- Opcjonalny AV scan jako plugin.
