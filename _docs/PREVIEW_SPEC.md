# Preview Spec (v1)

Cel: podglad draftu bez publikacji, przy zachowaniu tego samego runtime path co
public rendering.

## Two preview modes in admin

1. Canvas preview
- Wbudowany w edytor.
- Edytowalny.
- Stylowany tokenami Admin UI.

2. Runtime preview
- Read-only.
- Otwierany w modalu iframe z device switcherem.
- Stylowany tokenami Site Theme.
- Uzywa tego samego render pipeline co output publiczny (page templates + runtime link sources).
- Device selection jest synchronizowany miedzy headerem edytora a modalem i przekazywany jako `?device=desktop|tablet|mobile`.

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
- Widget template editor

## Runtime token flow

1. Admin klika `Runtime preview`.
2. API tworzy preview token (`preview_tokens`).
3. API zwraca `previewUrl` i `expiresAt`.
4. Pages editor moze poprosic o bounded probe (`probe: true`); serwer sprawdza
   tylko wygenerowany preview URL, nie dowolny URL z przegladarki.
5. Admin laduje `previewUrl` w iframe tylko gdy probe nie zwrocil bledu.
6. Runtime route `/preview` waliduje token i target type.
7. Render korzysta z tego samego pipeline co public site.

## Preview URL contract

- `GET /preview?type=page&token=<token>`
- `GET /preview?type=content&token=<token>`
- `GET /preview?type=widget-template&token=<token>`

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
- Pages `POST /pages/:id/preview` accepts optional `probe: true` and may return
  `probe: { ok, status, reason, targetLabel }`. The probe:
  - uses server-owned generated preview URLs only;
  - allows only the generated/approved origin;
  - follows bounded same-origin redirects and blocks external redirects;
  - uses a short timeout and does not persist response bodies, headers, or
    cookies;
  - redacts `token` and `device` from UI-safe diagnostics.

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

Widget template preview moze dodac metadata UI:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=widget-template&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "blocksCount": 3
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
