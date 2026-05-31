---
title: "Site Settings"
audience: "admin"
productArea: "settings"
language: "en"
keywords:
  - site settings
  - base urls
  - homepage
  - preview
  - content routes
---

# Basic

Site Settings is the public-site configuration surface for routing, preview
behavior, base URLs, and cache policy. It is where you decide how the public
site resolves, which pages act as homepage and 404, whether preview links work,
and how content types map to public URLs.

In the current UI, this screen includes:
- a site-settings section rail with:
  `Base URLs`, `Homepage & 404`, `Preview access`, `Content routes`,
  `Cache settings`, `Performance`,
- `Base URLs` and `Admin Access Path`,
- homepage and 404 selectors,
- preview enable/test controls,
- per-content-type route editors,
- cache TTL input,
- a shared auto-save toggle and `Save changes`.

# Medium

Use Site Settings when the question is about how the public site behaves, not
about what content says. The current route is designed for:
- separating admin and public base URLs,
- picking the main public entry pages,
- enabling or blocking preview URLs,
- defining list/detail routes for content types,
- controlling the basic HTML cache lifetime.

This screen is broader than one simple form. It is a section-based configuration
workspace that groups public runtime concerns into distinct areas.

# Instruction

1. Open `Settings > Site`.
2. Start with the left section rail to choose the part you actually need.
3. In `Base URLs`, review:
   - `Admin panel base URL`
   - `Public site URL`
   - `View homepage`
4. Use `Admin Access Path` when the admin URL path or root-redirect behavior
   must change.
5. In `Homepage & 404`, pick:
   - homepage
   - 404 page
6. Keep homepage and 404 separate.
7. In `Preview access`, decide whether preview should stay enabled.
8. Use `Test preview URL` only when preview is intentionally allowed and a
   homepage is selected.
9. In `Content routes`, review each enabled content type carefully.
10. For each route editor, check:
    - list path
    - detail path
    - enabled state
    - suggested paths
11. Use `Use suggested` when the generated route is closer to the intended
    public pattern than the current custom value.
12. In `Cache settings`, review `Cache TTL (seconds)`.
13. Set `0` only when the cache really needs to be disabled.
14. Treat the `Performance` section as informational for now; the current UI
    shows that future controls will live there later.
15. Review the `Auto-save settings across all screens` toggle before assuming
    save behavior.
16. Use `Save changes` when you want an explicit save after reviewing the whole
    public-site configuration.

Use this safe Site Settings order when you want fewer routing mistakes:
1. Base URLs first.
2. Homepage and 404 second.
3. Preview third.
4. Content routes fourth.
5. Cache policy last.

# Advanced

- `Base URLs` and `Admin Access Path` affect how both humans and systems reach
  the platform, so they should be treated as environment-level routing controls.
- `Content routes` is one of the highest-impact parts of this screen because it
  defines public URL shape for each content type.
- Suggested routes are there to reduce drift, but they are not automatically the
  right business choice in every project.
- `Preview access` is a publishing-control concern, not only a convenience
  toggle.
- The `Performance` section currently acts as a placeholder, which is still
  useful because it shows where future runtime controls will live.

# Troubleshooting

- The homepage does not open correctly:
  check the public base URL before blaming the homepage page selection.
- Preview links fail:
  confirm preview is enabled and that a homepage is selected.
- Routes conflict or feel wrong:
  review the content-type route editors one by one instead of changing multiple
  paths blindly.
- Admin URL behavior feels surprising:
  review both base URL and admin path/root-redirect settings together.
- Cache behavior feels stale:
  review the TTL before assuming the content pipeline is broken.

# Decision Guide

- Choose explicit save vs relying on auto-save:
  use explicit save when the public-site routing change needs deliberate review.
- Choose custom route vs suggested route:
  use suggested when the default pattern matches the model; keep custom only when
  the public URL shape truly needs it.
- Choose preview enabled vs disabled:
  keep it enabled when editorial preview is required; disable it when preview
  access should be blocked completely.

# Checklist

1. Confirm admin and public base URLs are correct.
2. Confirm homepage and 404 selections are intentional.
3. Confirm preview behavior is intentional.
4. Confirm each content-type route is correct and conflict-free.
5. Confirm cache TTL matches the desired runtime behavior.
6. Save changes deliberately.

# Security

- Site Settings is an authenticated admin surface and should only be used by
  users with high-trust configuration permissions.
- URL, preview, and admin-path changes can affect the whole public site and
  admin reachability, so they should be treated as operationally sensitive.
- Do not use these fields to store secrets or privileged values that belong in
  protected backend configuration.
