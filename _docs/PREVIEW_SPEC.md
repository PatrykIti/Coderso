# Preview Spec (v1)

Cel: podglad draftu bez publikacji, przy zachowaniu tego samego runtime path co
public rendering.

## Two preview modes in admin

1. Canvas preview
- Wbudowany w edytor.
- Edytowalny.
- Stylowany tokenami Admin UI.
- Pages v2 canvas preview uses the shared recursive renderer for nested layout
  blocks and receives block-path/depth/slot metadata for editor chrome. This
  metadata is admin-only and does not change public preview token semantics.
- Retained legacy renderer settings may render a shared read-only compatibility
  preview row through `WidgetRenderer` in `editor-preview` mode. This is not a
  selectable non-dashboard widget editor. Active editors preview their own
  section/block document through the owning renderer.

2. Runtime preview
- Read-only.
- Otwierany w modalu iframe z device switcherem.
- Stylowany tokenami Site Theme.
- Uzywa tego samego render pipeline co output publiczny (page templates + runtime link sources).
- Device selection jest wlasnoscia `RuntimePreviewDialog` i jest przekazywany
  jako `?device=desktop|tablet|mobile`.

## Unified admin preview UX

- Jeden wspolny komponent: `RuntimePreviewDialog`.
- Te same breakpointy urzadzen (desktop/tablet/mobile).
- Te same stany: `loading`, `error`, `empty`, `no-preview`.
- Dodatkowy recoverable state:
  gdy host preview jest nieosiagalny albo iframe nie zaladuje sie w oczekiwanym
  czasie, dialog pokazuje actionable placeholder zamiast pustej/broken ramki.
- Te same wymagania iframe: `sandbox="allow-same-origin allow-scripts"`.

Dotyczy:
- Page editor
- Content entry editor
- Page Template editor
- Detail page editor / internal detail-page preview route

## Runtime token flow

1. Admin klika `Preview`.
2. Pages editor z niezapisanymi zmianami najpierw wykonuje cichy sync draftu do
   `currentData` przez istniejace admin write API. Ten krok nie aktualizuje
   `publishedData`, wiec publiczni odwiedzajacy nadal widza ostatnia
   opublikowana wersje do czasu `Publish`.
3. API tworzy preview token (`preview_tokens`).
4. API zwraca `previewUrl` i `expiresAt`.
5. Pages editor moze poprosic o bounded probe (`probe: true`); serwer sprawdza
   tylko wygenerowany preview URL, nie dowolny URL z przegladarki.
6. Admin laduje `previewUrl` w iframe tylko gdy probe nie zwrocil bledu.
7. Runtime route `/preview` waliduje token i target type.
8. Render korzysta z tego samego pipeline co public site, ale dla stron preview
   czyta `currentData`; publiczny runtime bez tokena czyta `publishedData`.

Detail-page variant:
- `POST /admin/api/detail-pages/:id/preview` issue only the dedicated
  `type=detail-page` preview token.
- Request body must include `sampleEntryId`; runtime preview stores that value
  server-side in `preview_tokens.context` and does not trust raw query params.
- `type=detail-page` preview renders `current_document`; published
  `type=content&detailPageId=...` preview remains the separate path for
  previewing a specific entry against a published detail template.

## Preview URL contract

- `GET /preview?type=page&token=<token>`
- `GET /preview?type=content&token=<token>&detailPageId=<detail-page-id>`
- `GET /preview?type=detail-page&token=<token>`
- `GET /preview?type=page-template&token=<token>`

`type=page-template` (TASK-420-03) renderuje dokument Page v2 z
`page_templates` przez ten sam publiczny pipeline Page v2 co preview stron
(`renderPublicPageV2RuntimeHtml`), z semantyka `?device=` i fail-closed dla
nieczytelnych dokumentow. Separacja typow jest scisla: token `type=page` nie
wyrenderuje template, token `type=page-template` nie wyrenderuje strony.
`type=widget-template` jest wycofane i zwraca `404 Not Found`; stare tokeny
zapisane z tym typem failuja closed (`preview_token_invalid`).

Uwaga: `site.contentRoutes` moze teraz przenosic opcjonalne `detailPageId`
jako structural link do canonical detail-page document. `type=content` preview
moze uzyc tego linku albo jawnego `detailPageId`, ale tylko dla published
detail-page document zgodnego z previewed content type. Dedykowany
`type=detail-page` preview czyta `current_document` i wybiera sample entry
wylacznie z server-side `preview_tokens.context.sampleEntryId`; runtime nie ufa
surowym `sampleEntryId` query params.

Resolver policy dla `previewUrl` zwracanego przez Admin API:
1. `settings["site.publicBaseUrl"]`
2. `PUBLIC_BASE_URL` (ENV fallback)
3. request-derived `proto://host` (`x-forwarded-host` / `x-forwarded-proto` / `host`)
4. relative path fallback (`/preview?...`)

Uwaga: gdy `proto` jest nieznane, domyslnie stosujemy `https`, ale dla `localhost/127.0.0.1` -> `http`.

## Preview failure guidance

- For obvious loopback targets (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`)
  the dialog may preflight the preview origin and surface a specific
  "frontend not responding" placeholder.
- For non-loopback targets the dialog may fall back to an iframe-load timeout
  placeholder.
- Failure copy must not expose preview tokens; operator-facing diagnostics use
  the host or base URL only.
- Pages runtime preview may expose a direct route back to Page Settings when the
  configured public URL looks wrong.
- Pages editor preview dialog labels the surface truthfully ("Runtime preview of
  the saved draft (read-only, site theme).") and exposes a "Retry preview"
  affordance on the unavailable placeholder that re-runs the draft save + token
  issuance + probe flow instead of leaving a dead end.
- Pages `POST /pages/:id/preview` accepts optional `probe: true` and may return
  `probe: { ok, status, reason, targetLabel }`. The probe:
  - uses server-owned generated preview URLs only;
  - allows only the generated/approved origin;
  - follows bounded same-origin redirects and blocks external redirects;
  - uses a short timeout and does not persist response bodies, headers, or
    cookies;
  - redacts `token` and `device` from UI-safe diagnostics;
  - stays environment-robust for RFC 6761 loopback names: when the target
    hostname is `localhost` or `*.localhost` and the direct connection throws
    (for example, the resolver returns `::1` first while the HTTP server binds
    IPv4 only, as with `coderso-a.localhost` in dev), the probe retries once
    against `127.0.0.1` with the original `Host` header preserved. The
    `previewUrl`, target labels, allowed-origin checks, and token semantics are
    unchanged — only the probe's transport-level connection is substituted.

## Admin API response contract

Preview endpoints zwracaja spojny shape:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=page&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "probe": {
    "ok": false,
    "status": 503,
    "reason": "http_error",
    "targetLabel": "https://www.example.com/preview"
  }
}
```

`probe` is optional and currently adopted by Pages editor runtime preview. Other
runtime preview callers can keep the legacy no-probe timeout fallback until they
adopt resource-specific probe metadata.

Gdy resolver ma poprawny base URL, `previewUrl` jest absolutny, np.:

```json
{
  "token": "preview-token",
  "previewUrl": "https://www.example.com/preview?type=page&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z"
}
```

Page Template preview dodaje metadata UI:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=page-template&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "sectionsCount": 3
}
```

## Runtime preview CSS loading

- When a CSS bundle is available, we emit `rel="preload" as="style"` + `rel="stylesheet"`.
- In preview mode, the body stays hidden until `window.load`, regardless of whether styles come from a built CSS bundle or dev module scripts.

## Content entry preview routing

- `type=content` preview renders through the generic content-entry runtime
  contract by default.
- A generic `content_entries` record whose content type slug is `post` or
  `posts` must not be diverted into the dedicated Posts storage branch. This
  keeps Engine-owned entries previewable even when an operator names a
  collection `Post`.

## Security

- Token losowy, przechowywany jako hash.
- TTL i walidacja per `targetType`.
- Publiczny `/preview` nie wymaga sesji, ale wymaga poprawnego tokena.
- Po wygasnieciu zwracany jest `410 Preview expired`.
