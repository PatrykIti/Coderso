# Media Storage Spec (v1)

## Default

- Storage lokalny w core (filesystem) - v1.
- Publiczne serwowanie plikow przez core.
- V1 wspiera adaptery: local, S3, Azure.
- `media.key` przechowuje storage key do usuwania i przenoszenia plikow.

## Local storage

- Katalog: `MEDIA_DIR` (default `./storage/media`, np. `/data/media`).
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
- Dla uploadow i replace obrazow serwis media probuje zapisac `width` i `height`
  w rekordzie `media`. Parser jest bounded i nie dekoduje pikseli; wspiera PNG,
  JPEG, GIF i WebP.
- Jesli `title` nie zostanie podany przy uploadzie, domyslnie przyjmuje
  oryginalna nazwe pliku. `originalName` pozostaje read-only identity.

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

- Upload dropzone + manual browse.
- Wyszukiwarka po nazwie i tytule.
- Filtry: all, images, documents, audio.
- Panel szczegolow: podglad meta, edycja title/alt/caption, copy link,
  replace asset bez zmiany ID, usage links, file info i wymiary obrazow.
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
  assetu w obecnych wlascicielach danych: pages, content entries, posts i
  commerce products.
- Endpoint wymaga `media:read`. Zwracane `adminHref` wskazuje tylko istniejace
  kanoniczne trasy admina.
- Usage matcher szuka znanych ksztaltow referencji media (`mediaId`, `assetId`,
  `featuredMediaId`, tablice media IDs oraz rich-text `data-media-id`) bez
  broad substring matching.

## Admin maintenance actions

- `POST /media/:id/dimensions/recover` wymaga `media:write` i probuje uzupelnic
  wymiary tylko dla istniejacego obrazu bez `width`/`height`.
- `POST /media/:id/replace` wymaga `media:write`, waliduje nowy plik tym samym
  kontraktem co upload, zachowuje ID assetu i aktualizuje storage key/url,
  oryginalna nazwe, MIME, rozmiar oraz wymiary.

## Security

- Uploady tylko przez admin API (auth + CSRF).
- Opcjonalny AV scan jako plugin.
