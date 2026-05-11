# TASK-252-06-09: Team Members Photo Shape Socials and Fallbacks

# FileName: TASK-252-06-09_Team_Members_Photo_Shape_Socials_and_Fallbacks.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Expand Team with member cards, photo shape, socials, and image fallback
rendering while preserving any existing `spotlight` variant as legacy runtime
behavior only. Do not add profile-link controls, explicit selected-featured-
member controls, or per-person contact workflows.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/team/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/team/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/team/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/team/MATRIX.md`; for this leaf, start from the current owner fields `header`, `members`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: team member grid, social links, photo shape, and image alt/fallback
  behavior from `_docs/_WIDGETS/tmp/team/MATRIX.md`; add schema-owned
  `photoShape` and fallback initials behavior in `core/widgets/core/team.tsx`.
- Preserve the existing `spotlight` variant only as legacy/backward-compatible
  rendering; do not add editor controls for selected featured or leadership
  modes in this leaf.
- Adapt: profile links, explicit selected-featured-member controls, leadership
  mode, department labels, and hover overlays remain conditional; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `team`.
- `Visual`: `Members`, `Photos`, `Socials`, `Fallbacks`, `Layout`.
- `Advanced`: `Safe-link diagnostics`, `Legacy member mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/team.tsx`
- `core/admin/ui/widgets/editors/TeamEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/team.test.tsx`
- `tests/vitest/ui/team-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/_WIDGETS/tmp/team/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-09_Team_Members_Photo_Shape_Socials_and_Fallbacks.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type TeamPhotoShape = "circle" | "rounded" | "square";

type TeamSocialLink = {
  id?: string;
  platform: "linkedin" | "github" | "x" | "website";
  label: string;
  href: string;
  url?: string;
};

function normalizeTeamData(data: TeamData): TeamData {
  return {
    header: normalizeTeamHeader(data.header),
    members: normalizeTeamMembers(data.members),
    photoShape: normalizeTeamPhotoShape(data.photoShape),
    style: normalizeTeamStyle(data.style),
  };
}

function normalizeTeamMember(item: TeamMember, index: number): TeamMember {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `team-${index + 1}`),
    photoShape: normalizeTeamPhotoShape(item.photoShape),
    initials: normalizeTeamFallbackInitials(item.initials, item.name),
    photoAlt: normalizeTeamPhotoAlt(item.photoAlt, item.name),
    socialLinks: normalizeTeamSocialLinks(item.socialLinks),
  };
}

function normalizeTeamSocialLinks(items: TeamSocialLink[] | undefined): TeamSocialLink[] {
  return normalizeRepeatedItems(items, teamSocialLinksMax).map((link, index) => ({
    id: normalizeStableItemId(link.id, `team-social-${index + 1}`),
    platform: normalizeTeamSocialPlatform(link.platform ?? link.label),
    label: normalizeTeamSocialLabel(link.label),
    href: normalizeTeamSocialHref(link.href ?? link.url),
  }));
}

function TeamVisualEditor(props: WidgetEditorProps<TeamData>) {
  return (
    <WidgetEditorSection id="team.members" title="Members">
      {props.value.members.map((item, index) => (
        <Fragment key={item.id ?? index}>
          <WidgetControlRow id={`team.members.${index}.name`} label="Name" data-widget-control={`team.members.${index}.name`}>
            <Input value={item.name ?? ""} onChange={handleControlChange} />
          </WidgetControlRow>
          <WidgetControlRow id={`team.members.${index}.photoShape`} label="Photo shape" data-widget-control={`team.members.${index}.photoShape`}>
            <SegmentedControl value={item.photoShape ?? props.value.photoShape ?? "rounded"} onChange={(photoShape) => props.onChange(updateTeamMember(props.value, index, { photoShape }))} />
          </WidgetControlRow>
          <WidgetControlRow id={`team.members.${index}.socialLinks`} label="Social links" data-widget-control={`team.members.${index}.socialLinks`}>
            <SocialLinksEditor value={item.socialLinks ?? []} onChange={(socialLinks) => props.onChange(updateTeamMember(props.value, index, { socialLinks }))} />
          </WidgetControlRow>
        </Fragment>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/team/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/team.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add explicit schema/default/render/editor ownership for `photoShape`, fallback
  initials/alt text, and normalized social links with platform plus safe href;
  preserve legacy `label`/`url` social links through the normalizer.
- Refactor `core/admin/ui/widgets/editors/TeamEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Do not expose selected-featured, leadership, or `spotlight` layout editor
  controls in this leaf; only preserve existing `spotlight` payloads for
  backward-compatible rendering.
- Keep `spotlight` compatibility on the existing widget variant prop/registry
  path, not as a new `TeamData` schema field.
- If current editor/runtime code exposes a `spotlight` variant selector, remove
  or hide that option from `TeamEditors` for new TASK-252 selections. Preserve
  existing saved `spotlight` pages through the widget variant registry and
  renderer compatibility only; TASK-252-06-09 does not add new spotlight
  configuration.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `team` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `team` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/team.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    `core/widgets/core/widgetSafeHref.ts` helper with identical allowed/rejected
    protocol tests before render. A private `normalizeTeamSocialHref` helper is
    acceptable only as the team-owner adapter over that shared policy.
  - Team photos currently use a raw public `photo` URL field, not an existing
    MediaPicker/storage owner. This leaf must either add MediaPicker/storage
    ownership with editor/runtime/tests, or keep the raw-public-URL contract and
    add bounded URL sanitization plus widget/editor tests for unsafe photo
    values.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change; include accepted-new-field, unknown-field rejection, and
  legacy-normalization assertions for this widget.
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-09_Team_Members_Photo_Shape_Socials_and_Fallbacks.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `team` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
