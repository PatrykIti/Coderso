# Site Runtime

Dokument opisuje ustawienia runtime dla publicznego frontu oraz panelu admina.

## Base URLs (Admin / Public)

Ustawienia:
- `site.adminBaseUrl` — pełny URL do panelu admina (np. `https://cms.example.com`).
- `site.publicBaseUrl` — pełny URL do publicznej strony (np. `https://www.example.com`).
- `site.adminPath` — ścieżka panelu admina (np. `/admin-panel`).
- `site.adminRedirectEnabled` — czy przekierować root admin hosta do `site.adminPath`.

Zasady:
- Jeśli **oba** są ustawione i różne, hosty są rozdzielone:
  - `/admin` działa tylko na `site.adminBaseUrl`
  - publiczne trasy (w tym `/preview`) działają tylko na `site.publicBaseUrl`
  - `/media/*` jest dozwolone na obu hostach (publiczne assety)
- Jeśli ustawiony jest **tylko jeden** z URL-i, routing nie jest blokowany
  (host działa jako wspólny dla admina i frontu).
- Jeśli żaden nie jest ustawiony, system używa bieżącego hosta.

Admin path:
- `site.adminPath` domyślnie `"/admin"`.
- Root admin hosta może przekierować na `site.adminPath` (gdy `site.adminRedirectEnabled = true`).

## Preview URLs

Preview URL dla stron oraz wpisów:
- najpierw używa `site.publicBaseUrl`
- jeśli brak, korzysta z `PUBLIC_BASE_URL` (ENV)
- jeśli brak, generuje ścieżkę względną `/preview?...`
- `type=content` używa tokenów z `/content/:type/entries/:id/preview`
- `site.previewEnabled` może globalnie wyłączyć preview

## Homepage / 404 / Content Routes

Ustawienia sterowane z panelu (Settings → Site):
- `site.homepageId` — ID strony startowej
- `site.notFoundPageId` — ID strony 404
- `site.previewEnabled` — globalny toggle preview
- `site.contentRoutes` — mapowanie tras dla content types (list + detail)
- `site.cacheTtlSeconds` — TTL cache HTML w sekundach (0 = off)

Przykład `site.contentRoutes`:

```json
[
  {
    "type": "blog",
    "listPath": "/blog",
    "detailPath": "/blog/:slug",
    "enabled": true
  }
]
```

## Content Entry Templates

Publiczne listy i szczegóły wpisów korzystają z **template resolvera**:
- `type: content`
- kolejność: theme → plugin → core

Nazewnictwo template’ów:
- `content-<typeSlug>-list.tsx`
- `content-<typeSlug>-detail.tsx`
- `content-list.tsx`
- `content-detail.tsx`
- `content.tsx` (fallback)

Core fallbacki są w `core/templates/`.

## Public CSS Build

Publiczny frontend używa **osobnego CSS** (nie admin build).

- Build: `bun --cwd core build:site` → `core/dist/site`
- Runtime odczytuje `dist/site/manifest.json` i linkuje CSS jako `/site/assets/...`
- Tokeny z aktywnego **theme profile** są wstrzykiwane jako CSS variables w `<style>` (server‑side).

## SSR Cache

Public runtime cache’uje HTML per **path + aktywny theme profile**:
- domyślny TTL: `30s`
- `site.cacheTtlSeconds = 0` wyłącza cache
- cache jest czyszczony po publish/unpublish strony lub wpisu oraz po zmianie aktywnego profilu

## UI

Base URLs konfiguruje się w panelu admina:
**Settings → General → Base URLs**.

Admin path konfiguruje się w tym samym miejscu:
**Settings → General → Admin Access Path**.
