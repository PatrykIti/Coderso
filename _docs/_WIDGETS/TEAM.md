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
- Read-only members count summary

Notes:
- Switching to `spotlight` is non-destructive. Wizard only changes the layout
  variant; intentional member-count reductions belong to Visual where the
  destructive count guard is explicit.
- Team intentionally keeps the `1..12` member contract. Larger directories
  should use multiple Team sections or a different listing surface.
- Member count changes, names, roles, bios, photos, social links, spotlight
  lead, and CTA now belong to Visual.

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
- Destructive member-count reductions also use the shared
  `ConfirmActionDialog`; cancel keeps member order, photos, bios, and social
  links intact, and no Team count path calls native `window.confirm`.
- Social links live inside each member panel instead of a detached global
  section.
- Spotlight exposes an explicit `Set as spotlight lead` action plus an active
  lead badge.
- CTA destination authoring uses the shared page-first destination picker.
  Legacy custom destinations remain replace-or-clear compatibility state.
- Photo authoring uses media-library picking, inline preview, saved-photo
  compatibility copy, and clear-photo recovery. Visual no longer asks authors
  to paste image URLs.
- The widget Playwright smoke harness now seeds a deterministic Team portrait
  image through the authenticated admin media API and can verify real
  MediaPicker photo selection, clear-photo recovery, publish, and public image
  rendering when the live admin/frontend environment is available.
- Social authoring uses known platform choices plus profile names/handles.
  Legacy custom social destinations remain clearable compatibility state
  instead of editable raw URL fields.
- Switching a saved LinkedIn social link to another known platform preserves
  the portable profile handle by removing LinkedIn-only `in/` or `company/`
  path prefixes before the new platform URL is built.
- Color controls surface contrast advisories against the default theme text
  color for Team-local presentation changes and use swatch-only authoring
  instead of editable raw CSS/token text fields.

### Advanced (technical-only)
- Read-only layout summary
- Read-only surface and content summaries
- Read-only contract summary

Notes:
- Advanced no longer duplicates Visual-owned layout/style controls, no longer
  renders a raw payload snapshot, and no longer exposes mutating support
  actions in the daily tab flow.
- `teamEditorContract` declares Wizard as starter setup, Visual as daily
  content/style authoring, and Advanced as diagnostics-only with no writable
  paths.
- Team main text inputs/selects now use the same shared labeled-field pattern
  as Hero, and Team background surfaces now expose Hero-style transparent
  affordances where those background fields are Team-owned.

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
  - member names render as `h3` headings under the Team section heading
  - member cards expose explicit accessible labels, avatar images lazy-load
    with contextual `Photo of ...` alt text, and invalid/missing values fall
    back to initials
  - social links and the Team CTA resolve through the shared safe-link helper
    and open external destinations in a new tab

## Clear Controls

- `style.sectionBackground`, `style.cardSurface`, and `style.cardBorder` are
  clearable from Visual controls; clearing removes the configured fields and
  the renderer omits the matching inline style keys. Advanced only summarizes
  the saved color state.
- Section and card backgrounds also support explicit transparent state through
  the same beginner-oriented swatch flow used elsewhere in Hero-parity work.
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
