# TASK-018: Plugin Store Admin UI
# FileName: TASK-018_Plugin_Store_Admin_UI.md

**Priority:** Medium
**Category:** CMS/Plugins
**Estimated Effort:** Medium
**Dependencies:** TASK-017
**Status:** To Do

---

## Overview

Build the admin UI for browsing the store, installing plugins, and
managing updates.

**Goals:**
- Store browser with plugin details.
- Install/update/enable/disable actions.
- Update policy controls (auto-security default).

---

## Architecture

```
admin/ui/store/
  StoreList.tsx
  StoreDetail.tsx
admin/ui/plugins/
  PluginList.tsx
  PluginDetail.tsx
```

---

## Sub-Tasks

### TASK-018-01_Store_browser_UI

**Status:** To Do

- List plugins with filters and search.
- Plugin detail view (version, scans, permissions).

---

### TASK-018-02_Install_and_update_actions

**Status:** To Do

- Install modal with version selector.
- Update flow with security warning for non-security releases.
- Enable/disable buttons.

Example install request:

```ts
await fetch("/admin/api/plugins/install", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
  body: JSON.stringify({ name: "seo-boost", version: "1.0.0" }),
});
```

---

### TASK-018-03_Update_policy_controls

**Status:** To Do

- Default policy: auto-security.
- Per-plugin overrides (manual/auto-security).

---

## Testing Requirements

- [ ] Install calls `POST /plugins/install`.
- [ ] Update calls `POST /plugins/:name/update`.
- [ ] Policy changes persist to plugin settings.

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (store UI flows).
- `_docs/CMS_API.md` (store endpoints usage).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-plugin-store-ui.md`
- Notes: store browser and plugin management UI.

---

## Additional Docs

- `_docs/STORE_SPEC.md`
