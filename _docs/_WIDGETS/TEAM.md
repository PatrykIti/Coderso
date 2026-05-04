# Team Widget (v1)

## Purpose

Profile section for showcasing team members with roles, bios, photos, and social links.

## Widget ID

`team`

## Variants (v1)

- `cards`: responsive profile cards grid
- `compact-list`: stacked compact member rows
- `spotlight`: highlighted lead member plus supporting profiles

## Editor Modes (current after TASK-050-13-04)

### Wizard (minimal onboarding)
- Team layout variant
- Members count
- Quick setup for first member names

### Visual (primary editing mode)
Sections:
1. Variant and member structure
2. Header copy
3. Members content and order
4. Social links
5. Card and layout style

Notes:
- Team widget owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Technical layout tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `cards`.
- Renderer outputs deterministic markers:
  - `data-team-variant`
  - `data-team-count`
  - `data-team-columns`
  - `data-team-gap`
  - `data-team-radius`
  - `data-team-member`
  - `data-team-social-count`
  - `data-team-spotlight-lead`
- Member normalization is deterministic:
  - count clamped to `1..12`
  - member IDs deduplicated
  - social links normalized and capped to `5` per member

## Clear Controls

- `style.cardSurface` and `style.cardBorder` are clearable from Visual and
  Advanced controls; clear removes the configured fields and card renderers omit
  the matching inline background/border style keys.
- Gap and radius continue to use the approved `none` token semantics.

## Data Model (summary)

```json
{
  "header": {
    "title": "Meet the team",
    "description": "Introduce key people behind delivery, support, and strategy."
  },
  "members": [
    {
      "id": "member-1",
      "name": "Anna Kowalska",
      "role": "Head of Product",
      "bio": "Drives product direction and aligns roadmap with customer goals.",
      "photo": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      "socialLinks": [
        { "id": "social-1", "label": "LinkedIn", "url": "#" }
      ]
    }
  ],
  "style": {
    "columns": "3",
    "gap": "md",
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "radius": "lg"
  }
}
```
