# Team Widget (v1)

## Purpose

Profile section for showcasing team members with roles, bios, photos, social
links, and an optional section CTA.

## Widget ID

`team`

## Variants (v1)

- `cards`: responsive profile cards grid
- `compact-list`: stacked compact member rows
- `spotlight`: highlighted lead member plus supporting profiles

## Editor Modes (current after TASK-289 + TASK-256-06-04 + TASK-336-19)

### Wizard (minimal onboarding)
- Team layout variant
- Members count with Spotlight guardrails
- Quick setup for the first three member names and roles

Notes:
- Switching to `spotlight` from a larger setup clamps the member list to `3`
  when the current count is greater than `6`.
- Team intentionally keeps the `1..12` member contract. Larger directories
  should use multiple Team sections or a different listing surface.

### Visual (primary editing mode)
Sections:
1. Variant and member structure
2. Header and CTA
3. Member cards, photos, and social links
4. Team presentation and color guidance

Notes:
- Team owns variant selection in Visual
  (`visualOwnsVariantSelection = true`).
- Add-member affordances are available at both the top and bottom of long
  member lists.
- Member removal and social-link removal require explicit confirmation.
- Social links live inside each member panel instead of a detached global
  section.
- Spotlight exposes an explicit `Set as spotlight lead` action plus an active
  lead badge.
- CTA destination authoring uses the shared page-first destination picker.
  Legacy custom destinations remain replace-or-clear compatibility state.
- Photo authoring uses media-library picking, inline preview, saved-photo
  compatibility copy, and clear-photo recovery. Visual no longer asks authors
  to paste image URLs.
- Social authoring uses known platform choices plus profile names/handles.
  Legacy custom social destinations remain clearable compatibility state
  instead of editable raw URL fields.
- Color controls surface contrast advisories against the default theme text
  color for Team-local presentation changes.

### Advanced (technical-only)
- Technical layout and presentation tokens
- Normalization and reset utilities
- Raw payload snapshot

Notes:
- Advanced exposes bounded token controls for `columns`, `gap`, `radius`,
  `cardBorderWidth`, `compactMobileBio`, `sectionBackground`, `cardSurface`,
  and `cardBorder`.

## Runtime Behavior Notes

- Invalid or unknown variant values fall back to `cards`.
- Renderer outputs deterministic markers:
  - `data-team-variant`
  - `data-team-count`
  - `data-team-columns`
  - `data-team-gap`
  - `data-team-radius`
  - `data-team-header-align`
  - `data-team-title-size`
  - `data-team-border-width`
  - `data-team-compact-mobile-bio`
  - `data-team-member`
  - `data-team-social-count`
  - `data-team-spotlight-lead`
  - `data-team-cta`
- Member normalization is deterministic:
  - count is clamped to `1..12`
  - member IDs are deduplicated
  - social links are normalized and capped to `5` per member
  - explicitly cleared bios stay cleared instead of being replaced with
    fallback copy
- `spotlightLeadId` must point at an existing member; otherwise Spotlight falls
  back to the first normalized member.
- `compactMobileBio: hide` hides compact-list bios visually on small screens
  while keeping the text available again from `sm` and up.
- The shared Team baseline from `TASK-256-06-04` remains in force:
  - section output uses an accessibility label
  - the header title renders through the shared bounded heading baseline
  - member cards expose explicit accessible labels, avatar images lazy-load
    with contextual `Photo of ...` alt text, and invalid/missing values fall
    back to initials
  - social links and the Team CTA resolve through the shared safe-link helper
    and open external destinations in a new tab

## Clear Controls

- `style.sectionBackground`, `style.cardSurface`, and `style.cardBorder` are
  clearable from Visual and Advanced controls; clearing removes the configured
  fields and the renderer omits the matching inline style keys.
- Gap, radius, border width, header alignment, title size, and compact mobile
  bio remain bounded tokens rather than arbitrary CSS.

## Data Model (summary)

```json
{
  "header": {
    "eyebrow": "Our team",
    "title": "Meet the team",
    "description": "Introduce key people behind delivery, support, and strategy.",
    "align": "center",
    "titleSize": "2xl"
  },
  "members": [
    {
      "id": "member-1",
      "name": "Anna Kowalska",
      "role": "Head of Product",
      "bio": "Drives product direction and aligns roadmap with customer goals.",
      "photo": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      "socialLinks": [
        {
          "id": "social-1",
          "label": "LinkedIn",
          "url": "https://www.linkedin.com/in/anna-kowalska"
        }
      ]
    }
  ],
  "spotlightLeadId": "member-1",
  "cta": {
    "label": "Join our team",
    "url": "/careers"
  },
  "style": {
    "columns": "3",
    "gap": "md",
    "sectionBackground": "var(--color-bg-muted)",
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "cardBorderWidth": "1",
    "radius": "lg",
    "compactMobileBio": "show"
  }
}
```
