# TASK-054-21: Coderso Multilingual and i18n Suite
# FileName: TASK-054-21_Coderso_Multilingual_and_i18n_Suite.md

**Priority:** High  
**Category:** i18n + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06, TASK-055, TASK-046, TASK-054-17  
**Status:** Done (2026-04-29)

---

## Closure Note

This planning stub is closed as superseded by
`TASK-240_Coderso_Multilingual_and_i18n_Umbrella.md`.

The original `TASK-054` umbrella now closes around the delivered Advanced admin
IA/routing contract. Multilingual and i18n work remains valid product scope,
but it is tracked as a standalone execution-ready umbrella in `TASK-240`
instead of keeping `TASK-054` open.

## Goal

Provide multilingual and i18n support for content, pages, widgets, and runtime routes.

## Features

- Locale management (default locale, enabled locales, fallback locale).
- Localized slugs and SEO fields.
- Localized content entries and posts with translation linking.
- Locale-aware routes and template resolution.
- Language switcher widget and localized navigation handling.

## Files to Change

- `core/db/schema.ts` (translation linkage and locale columns)
- `core/services/i18n/*` (new)
- `core/services/content/*` (locale-aware list/get/update)
- `core/server/publicSite.tsx` (locale route resolution)
- `core/server/routes/i18nRoutes.ts` (new)
- `core/admin/ui/i18n/*` (new)
- `core/widgets/core/languageSwitcher.tsx` (new)
- `core/widgets/core/navigation.tsx` (locale aware)

## Pseudocode

```ts
const locale = resolveLocaleFromRequest(request, settings);
const entry = await getEntryBySlug({ slug, locale, fallbackLocale });

if (!entry) return notFound();
return renderTemplate(templateKey, { locale, entry });
```

## Theme Compatibility Requirement

- i18n admin screens use existing Admin UI theme tokens and template components.
- Widget locale controls follow existing Visual/Advanced panel style conventions.

## Acceptance Criteria

1. Site owner can add locales and publish translated versions.
2. Runtime serves localized routes/content with deterministic fallback.
3. Language switcher works with pages, posts, and listing routes.
4. Admin UI themes apply consistently to i18n management screens.

## Testing Requirements

- Unit: locale resolver, fallback strategy, translation linking.
- Unit: localized slug uniqueness and validation rules.
- Integration: localized routes for pages/posts/listings.
- UI unit: translation editor and locale switch controls.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/SITE_RUNTIME.md` (or runtime docs currently used)
- `_docs/_CHANGELOG/*.md` (when implemented)
