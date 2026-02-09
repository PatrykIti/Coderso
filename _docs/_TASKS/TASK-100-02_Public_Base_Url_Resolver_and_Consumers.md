# TASK-100-02: Public Base URL Resolver and Consumers
# FileName: TASK-100-02_Public_Base_Url_Resolver_and_Consumers.md

**Priority:** High  
**Category:** Core/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-100-01, TASK-046, TASK-047  
**Status:** To Do

---

## Overview

Ujednolicamy generowanie absolutnych URL-i (preview, reset links, ewentualne runtime links)
przez jeden resolver z deterministyczna kolejnoscia fallbackow.

---

## Resolver Policy

Kolejnosc zrodel:
1. `settings["site.publicBaseUrl"]`
2. `process.env.PUBLIC_BASE_URL` (kompat)
3. request-derived `proto://host` (gdy kontekst request jest dostepny)
4. `null` (brak absolutnego URL)

Zasada:
- helper zwraca zawsze URL z trailing slash, albo `null`.
- helper do dolaczania sciezek pilnuje pojedynczych slashy.

---

## Pseudo-Implementation

```ts
// core/server/utils/publicBaseUrl.ts
export type PublicUrlContext = {
  host?: string | null;
  forwardedProto?: string | null;
  protocol?: string | null;
};

export async function resolvePublicBaseUrl(
  ctx?: PublicUrlContext
): Promise<string | null> {
  const configured = await getSetting("site.publicBaseUrl");
  if (isValidHttpUrl(configured)) return normalizeTrailingSlash(configured);

  if (isValidHttpUrl(process.env.PUBLIC_BASE_URL)) {
    return normalizeTrailingSlash(process.env.PUBLIC_BASE_URL);
  }

  const host = normalizeHost(ctx?.host);
  if (!host) return null;
  const proto = normalizeProto(ctx?.forwardedProto ?? ctx?.protocol) ?? "https";
  return `${proto}://${host}/`;
}

export const buildAbsolutePublicUrl = (base: string | null, path: string) =>
  base ? new URL(path, base).toString() : path;
```

```ts
// core/server/utils/previewUrls.ts
const base = await resolvePublicBaseUrl(routeCtxToPublicUrlContext(ctx));
return buildAbsolutePublicUrl(base, previewPath);
```

---

## Consumer Updates

| File | Action | Notes |
| --- | --- | --- |
| `core/server/utils/baseUrl.ts` | refactor/replace | canonical resolver facade |
| `core/server/utils/previewUrls.ts` | update | use new resolver + absolute URL build |
| `core/server/routes/pageRoutes.ts` | update | pass request context if needed |
| `core/server/routes/contentEntryRoutes.ts` | update | pass request context if needed |
| `core/server/routes/widgetTemplateRoutes.ts` | update | preview URLs parity |
| `core/server/routes/authRoutes.ts` | update | reset link builder integration (if mail payload includes absolute link) |

---

## Acceptance Criteria

- Wszystkie preview endpointy zwracaja URL budowany przez wspolny helper.
- Brak duplikacji logiki `PUBLIC_BASE_URL` w route handlers.
- Przy braku konfiguracji absolutnego base URL endpoint zwraca poprawna sciezke relatywna.
- Dla poprawnej konfiguracji endpoint zwraca URL absolutny.

---

## Testing Requirements

- `tests/unit/server/publicBaseUrl.test.ts` (new):
  - settings source wins over env
  - env fallback works
  - request host fallback works
  - invalid host/proto rejected
- `tests/unit/server/previewUrls.test.ts` (update):
  - absolute URL for configured base
  - relative fallback when no base

---

## Documentation Updates Required

- `_docs/CMS_API.md` (preview response URL behavior)
- `_docs/PREVIEW_SPEC.md` (absolute vs relative URL policy)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-100-02-public-base-url-resolver.md`
