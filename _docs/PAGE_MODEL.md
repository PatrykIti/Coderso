# Page Builder Data Model (v1)

Specyfikacja JSON dla `pages.current_data` i `pages.published_data`.
Model musi byc stabilny i wersjonowany.

## Root document

```json
{
  "schemaVersion": 1,
  "title": "Home",
  "seo": {
    "title": "string",
    "description": "string",
    "noIndex": false
  },
  "blocks": []
}
```

## Page-level settings.layout (v1)

`page.data.settings.layout` controls wrapper-level layout for runtime preview and
published rendering.

```json
{
  "settings": {
    "template": "landing",
    "showInNav": true,
    "revisionRetention": 10,
    "layout": {
      "wrapper": {
        "container": "full",
        "maxWidth": "5xl",
        "padding": { "top": "none", "bottom": "none" },
        "background": {
          "color": "transparent",
          "image": null,
          "media": {
            "type": "none",
            "source": "external",
            "src": null
          }
        }
      },
      "sections": {
        "gap": "none",
        "defaults": {
          "container": "default",
          "padding": { "top": "xl", "bottom": "xl" },
          "margin": { "top": "none", "bottom": "none" }
        }
      },
      "applyDefaultsToNewBlocks": false
    }
  }
}
```

Notes:
- `layout.container`, `layout.padding.*`, and `layout.margin.*` may use
  `"inherit"` to keep the page section default. The builder must present these
  as inherited values with their effective defaults, not as saved overrides.
- `visibility.devices: []` means the block is hidden on all devices and is not
  rendered in public SSR or preview-device output. Omitted `visibility.devices`
  keeps the default desktop/tablet/mobile visibility.
- `layout.wrapper.background.media` supports `none | image | video` with
  `source: library | external`.
- For backwards compatibility, legacy `background.image` is normalized into
  `background.media` when possible.
- `applyDefaultsToNewBlocks` affects editor insertion behavior (new blocks), not
  published rendering.

## settings.template (v1)

`page.data.settings.template` controls which **page template** is used in runtime rendering (public + runtime preview).

Template resolution uses the same resolver order as other theme templates:
1. Theme: `themes/<theme>/templates/page-<key>.tsx` then `themes/<theme>/templates/page.tsx`
2. Plugins: `plugins/views/page-<key>.tsx` then `plugins/views/page.tsx`
3. Core: `core/templates/page-<key>.tsx` then `core/templates/page.tsx`

Key normalization rules:
- trim + lowercase
- replace non-alphanumeric sequences with `-`
- strip leading/trailing `-`
- fallback to `landing` when empty/invalid

## settings.showInNav (v1)

`page.data.settings.showInNav` controls whether a page participates in the runtime pages index used by the Navigation widget when `linksSource = "pages"`.

Runtime semantics:
- published pages only
- missing `showInNav` is treated as `true` (backwards compatibility)
- stable sort: `title` then `slug`

## settings.revisionRetention (v1)

`page.data.settings.revisionRetention` controls how many publish revisions are kept per page.

Defaults and limits:
- default: 10
- min: 1
- max: 100

Runtime semantics:
- applied on publish
- oldest revisions are pruned when the limit is exceeded

## Page revisions and settings autosave (v1)

`page_revisions` stores two kinds of snapshots:
- `publish` - created on publish and governed by `settings.revisionRetention`
- `autosave` - latest unsaved Page Settings snapshot, overwritten per page

Stored snapshot contract:

```json
{
  "title": "Home draft",
  "slug": "/home-draft",
  "data": {
    "schemaVersion": 1,
    "blocks": [],
    "settings": {
      "template": "landing",
      "showInNav": false
    }
  }
}
```

Semantics:
- autosave is created when the Page Settings drawer closes with unsaved changes
- only one autosave is kept per page
- restore applies `title`, `slug`, and `current_data`
- discard is allowed only for autosave snapshots
- legacy publish revisions without `title/slug` still restore `current_data`

## Block structure

```json
{
  "id": "uuid",
  "type": "hero",
  "variant": "centered",
  "data": {},
  "layout": {
    "container": "default",
    "padding": { "top": "xl", "bottom": "xl" },
    "margin": { "top": "none", "bottom": "none" },
    "background": { "color": "white", "image": null }
  },
  "visibility": {
    "devices": ["desktop", "mobile"],
    "enabled": true
  },
  "editor": {
    "mode": "visual",
    "wizardCompleted": true
  },
  "slots": {
    "default": []
  },
  "children": []
}
```

Notes:
- `editor` jest tylko dla `current_data` (nie kopiujemy do published).
- `variant` jest opcjonalny, ale rekomendowany dla widgetow.
- `slots` to preferowany model zagniezdzania (nazwane miejsca w contanerze).
- `slots` wspiera:
  - sloty stale (`content`, `right`, `bottom`)
  - sloty repeatable z instancjami (`column:1`, `column:2`, ...).
- `children` jest legacy — jesli wystepuje bez `slots`, mapujemy do `slots.default`.
- Przyklad: `hero` uzywa slotu `content` na dodatkowe bloki pod CTA.

Repeatable slot contract:
- definicja widgetu ustawia `slots[].kind = "repeatable"`.
- `minItems` i `maxItems` reguluja liczbe instancji slotu.
- normalizacja migruje legacy `slots.<id>` do pierwszej instancji
  i zapewnia minimalna liczbe instancji.

---

## Template section block (v1)

Template sections render widget templates inside page content flow.

```json
{
  "id": "b-template",
  "type": "template-section",
  "variant": "default",
  "data": {
    "templateId": "template-id",
    "templateName": "Hero Cluster",
    "resolved": {
      "blocks": [],
      "error": "template_missing"
    }
  }
}
```

Notes:
- `data.resolved` is runtime-only; it is injected during preview/public rendering.
- `error` values: `template_missing | template_unpublished | template_loop`.


---

## Layout tokens (v1)

Dozwolone wartosci:
- container: `default | narrow | full`
- spacing: `none | xs | sm | md | lg | xl | 2xl`

---

## Example: Hero block

```json
{
  "id": "b1",
  "type": "hero",
  "variant": "split",
  "data": {
    "headline": "Budujemy szybciej",
    "subhead": "Oszczedzaj czas",
    "primaryCta": { "label": "Umow konsultacje", "href": "/kontakt" },
    "media": { "type": "image", "src": "/img/hero.jpg", "alt": "Dom" },
    "style": {
      "headlineSize": "4xl",
      "textColor": "#0f172a",
      "borderColor": "#d1d5db",
      "borderWidth": "1",
      "primaryButtonBg": "#2563eb",
      "primaryButtonText": "#ffffff"
    }
  },
  "layout": {
    "container": "default",
    "padding": { "top": "xl", "bottom": "xl" },
    "background": { "color": "white" }
  }
}
```

---

## Example: Compare timeline block

```json
{
  "id": "b2",
  "type": "compare-timeline",
  "variant": "dual-track-highlight",
  "data": {
    "axis": { "steps": [{ "label": "Projekt" }, { "label": "Fundament" }] },
    "tracks": [
      { "id": "a", "label": "Tradycyjna budowa", "markers": [0, 1] },
      { "id": "b", "label": "Z nami", "markers": [0, 1],
        "segments": [{ "from": 0, "to": 1, "label": "Prefabrykacja" }] }
    ],
    "guides": { "enabled": true, "style": "dashed" },
    "style": { "highlightColor": "amber" }
  }
}
```
