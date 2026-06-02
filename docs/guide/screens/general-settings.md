---
title: "General Settings"
audience: "admin"
productArea: "settings"
language: "en"
keywords:
  - general settings
  - site identity
  - branding
  - locale
  - autosave
---

# Basic

General Settings is the baseline site-identity and branding surface for the
admin workspace. It is where you manage the default site name, locale,
timezone, logo, favicon, and save behavior shared across settings screens.

In the current UI, this screen includes:
- the settings sidebar,
- a `Site Identity` card,
- a `Branding` card,
- an auto-save toggle,
- `Save changes`.

# Medium

Use General Settings when the site’s shared identity or admin branding needs to
change at the environment level rather than inside one content screen. The
current route is designed for:
- keeping the site name and default locale coherent,
- reviewing the current timezone baseline,
- updating logo and favicon assets for the admin experience,
- choosing whether settings should auto-save across screens.

Both `/settings` and `/settings/general` currently point at this same surface,
so this route is the default entry point into the broader settings area.

# Instruction

1. Open `Settings` or `Settings > General`.
2. Start with the left settings sidebar to confirm you are on `General`.
3. In `Site Identity`, review:
   - `Site name`
   - `Primary locale`
   - `Timezone`
4. Update the site name when the shared environment label needs to change.
5. Update the primary locale when the default language baseline should change.
6. Review timezone carefully because it affects shared environment expectations.
7. Move to `Branding`.
8. Use the logo upload area when the admin experience needs a new site logo.
9. Use the favicon controls when the browser-level icon needs to change:
   - `Upload new`
   - `Remove`
10. Decide whether `Auto-save settings across all screens` should stay enabled.
11. Use `Save changes` when you want an explicit save instead of relying only on
    auto-save behavior.
12. Treat these changes as shared environment configuration, not as isolated
    content edits.

Use this safe General Settings order when you want fewer configuration mistakes:
1. Confirm the route and sidebar section.
2. Review site identity.
3. Review branding.
4. Decide on auto-save behavior.
5. Save intentionally.

# Advanced

- `/settings` and `/settings/general` sharing the same screen means this page is
  the default anchor for the whole settings area, not just another subsection.
- Auto-save is a cross-screen behavior in the current UI, so changing it here
  affects how the rest of settings work operationally.
- Branding changes are more than visual polish. Logo and favicon updates change
  how the environment is identified across the admin experience.
- Locale and timezone should be treated as environment assumptions, not as minor
  dropdown cosmetics.
- General Settings should stay focused on shared identity and branding; deeper
  runtime or assistant behavior belongs on their own settings routes.

# Troubleshooting

- You are not sure whether the change belongs here:
  use General Settings only for shared site identity and branding, not for
  content edits or deeper runtime logic.
- A branding update feels too local:
  remember that logo and favicon here affect the broader admin experience.
- Auto-save behavior feels surprising:
  check the toggle first before assuming save timing is broken.
- The wrong route opened:
  `/settings` and `/settings/general` intentionally land on the same General
  Settings screen.

# Decision Guide

- Choose auto-save vs explicit save:
  use explicit save when the change needs deliberate confirmation; keep
  auto-save on only when that broader behavior is wanted across settings.
- Choose identity change vs branding change:
  use identity fields for name/locale/timezone; use branding controls for logo
  and favicon.
- Choose General vs Site vs Assistant settings:
  use General for shared identity and branding; move to Site or Assistant when
  the change affects those dedicated domains instead.

# Checklist

1. Confirm the site name is correct.
2. Confirm locale and timezone are intentional.
3. Confirm logo and favicon changes are the right shared branding move.
4. Confirm the auto-save toggle is set intentionally.
5. Save changes deliberately.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- If this screen has unsaved edits, moving to another Settings section,
  browser Back/Forward, or refresh/close prompts before the draft is discarded.
- Choose cancel/keep editing when you need to preserve the current draft.

# Security

- General Settings is an authenticated admin surface and should only be used by
  users with environment-level configuration permissions.
- Branding and identity changes can affect how the whole admin environment is
  perceived, so they should be treated as controlled configuration updates.
- Do not use these fields to store secrets, tokens, or operational values that
  belong in protected backend settings.
