# Site Runtime

Dokument opisuje ustawienia runtime dla publicznego frontu oraz panelu admina.

## Base URLs (Admin / Public)

Ustawienia:
- `site.adminBaseUrl` — pełny URL do panelu admina (np. `https://cms.example.com`).
- `site.publicBaseUrl` — pełny URL do publicznej strony (np. `https://www.example.com`).

Zasady:
- Jeśli **oba** są ustawione i różne, hosty są rozdzielone:
  - `/admin` działa tylko na `site.adminBaseUrl`
  - publiczne trasy (w tym `/preview`) działają tylko na `site.publicBaseUrl`
  - `/media/*` jest dozwolone na obu hostach (publiczne assety)
- Jeśli ustawiony jest **tylko jeden** z URL-i, routing nie jest blokowany
  (host działa jako wspólny dla admina i frontu).
- Jeśli żaden nie jest ustawiony, system używa bieżącego hosta.

## Preview URLs

Preview URL dla stron oraz wpisów:
- najpierw używa `site.publicBaseUrl`
- jeśli brak, korzysta z `PUBLIC_BASE_URL` (ENV)
- jeśli brak, generuje ścieżkę względną `/preview?...`

## UI

Base URLs konfiguruje się w panelu admina:
**Settings → General → Base URLs**.

