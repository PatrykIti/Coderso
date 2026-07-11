# TASK-536-03-L01: Upload Control and Hidden ID Contract

# FileName: TASK-536-03-L01-Upload-Control-And-Hidden-Id-Contract.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-03
**Priority:** Critical
**Category:** Forms Block / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-536-02-L01
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Correct the Form file-field DOM contract so browser validity belongs to the native file
input, submission identity belongs to a separate hidden control, and runtime status/error
text is programmatically associated with the field.

This is technical markup repair for the existing public Form block/section renderer in
the historical `core/widgets` namespace. Do not add or extend non-dashboard widget
authoring, editor controls, presets, registry/module-pack entries, or block types.

## Source ownership

This leaf is the sole general writer of core/widgets/core/formEmbed.tsx for TASK-536 and owns
compatibility/changed-behavior updates in `tests/vitest/widgets/formEmbed.test.tsx` before
its gate. The final runtime audit adds one narrow shared-renderer seam: this leaf may edit
only the existing nonce/CAPTCHA hidden inputs in `core/widgets/core/contact.tsx` and
`core/widgets/core/newsletter.tsx`, plus matching assertions in their existing suites, to
add the same trusted security-role markers used by Form Embed. It may not change their
data models, editor modes, controls, layout, copy, registry entries, or block types. The schema owner's
`tests/vitest/forms/fileField.test.ts` is not edited here. It must not edit
formRuntimeScript.ts, other tests, Forms services/routes, docs, tasks, or changelog files.
Because this leaf newly brings all three touched renderer sources into a max-warnings-zero
gate, it may also perform only the two mechanically verified no-behavior Newsletter lint
cleanups already present at HEAD: rename the unused normalizer argument to `_value` and
remove the unused `submissionDefaults` local. No other opportunistic cleanup is allowed.

## Implementation Pseudocode

~~~tsx
function allocateFieldDomIds(widgetId, fields, outerIds): Map<ResolvedFormField, FieldDomIds> {
  reserved = new Set(outerIds); // seed every non-field id emitted by this form
  for field in resolved source order:
    base = existing slugify(field.id || field.name || field.label || "field") || "field";
    candidate = base, then base-2, base-3, ... until every candidate family member
      `${widgetId}-${candidate}` plus `-label`, `-helper`, and `-upload-status`
      is absent from reserved;
    reserve the complete four-member family;
    map this field object to inputId, labelId, uploadStatusId, and helperId only when
      field.settings.helper is present (a reserved-but-unauthored helper stays undefined);
  return map;
}

compute sectionLabelId first and pass it as an outer id when authored;
allocate once across all resolved fields before step rendering;
pass the mapped ids into renderFieldControl in both single-step and multi-step paths;
preserve existing bytes whenever the original complete id families do not intersect;

if field.type === "file":
  render input type="file" with:
    no name;
    required={required};
    data-required-original;
    accept and multiple from normalized settings;
    data-form-file-input={field.name};
    data-form-file-multiple={multiple ? "1" : "0"};
    aria-describedby={[helperId, uploadStatusId].filter(Boolean).join(" ")}.

  render input type="hidden" with:
    name={field.name};
    no required, no aria-required, and no data-required-original;
    data-form-file-value={field.name};
    data-form-file-multiple={multiple ? "1" : "0"};
    uncontrolled defaultValue="" (never controlled value="");

  render status node with:
    id={uploadStatusId};
    data-form-file-status={field.name};
    className containing empty:sr-only so the neutral node stays in the accessibility
      tree but contributes no normal-flow spacing;
    role="status";
    aria-live="polite";
    initially empty/neutral.

  place this status immediately before the optional helper node. This DOM order is part
    of the layout contract: under Tailwind 4 space-y, an empty last-child status would
    make the preceding helper gain trailing spacing even while the status is absolute;
    keeping the helper as the final flow child preserves neutral geometry.

  do not render a second field error node; this status node is the sole field-level
    progress/success/error outcome surface. L02 mutates this same node to bounded
    error text + role="alert" + aria-live="assertive", then restores status/polite
    semantics for neutral/progress/success. Non-empty text automatically defeats the
    empty:sr-only selector; L02 must not add a competing hidden attribute/class toggle.
~~~

The three role attributes are the exact cross-file identity contract:
`data-form-file-input={field.name}`, `data-form-file-value={field.name}`, and
`data-form-file-status={field.name}`. Their non-empty values must match byte-for-byte
within one field. For every server-normalized unique file field, render exactly one
triple. Raw field IDs remain distinct at the schema layer but may collide after slugify
(`"a b"`/`"a-b"`), with another role suffix (`"a"`/`"a-upload-status"`), or with a
non-field form id (`"title"` versus `sectionLabelId`); the shared
allocator must make every input/label/helper/status family globally collision-free and
deterministic across single- and multi-step rendering. A regression fixture with two
ordinary file fields plus slug and cross-role collisions must prove all rendered `id`
values are unique and each label/describedby token resolves to its own element. L01 does
not add schema/filtering logic or claim that an arbitrary malformed transient
`resolved.fields` payload is normalized here; L02 owns fail-closed duplicate/malformed
marker handling. Do not introduce a second key attribute, pair by DOM order, or use the
raw input's absent `name` as identity. The runtime consumes these exact spellings; CSS
escaping is required when a value enters a selector.

`data-form-file-multiple` is exactly byte `"0"` or `"1"` on the raw and hidden controls,
and both values must match. `accept` exists only on the native file input; the hidden
companion never receives it. L02 validates both marker values plus parity with native
`input.multiple` before copying that property into a binding. Missing, malformed, or
mismatched markers make the identity fail closed.

The raw file control stays unnamed. For a single field the companion contains one media
UUID. For multiple it contains a JSON array string that only the runtime marker-aware
serializer may decode; generic hidden fields retain their current string semantics.

## Conditional logic and accessibility

The existing data-required-original mechanism must remove required while the field is
hidden and restore it when visible. The runtime must clear the companion/status when a
field becomes hidden or disabled. The helper/status ID list must not contain missing IDs.
Screen readers receive uploading, complete, and error transitions without moving focus.

## Error and compatibility contract

Markup alone never marks an upload complete. An empty hidden companion is the neutral
state. The hidden companion uses `defaultValue=""`, so the later runtime can own and
mutate `hidden.value` without React-controlled reset semantics. Old stored Forms
documents render through existing normalizers. No schema/default is added. Before source
editing, pin the exact literal `renderToString` HTML of one representative mixed non-file
fixture after replacing only the inline runtime-script payload with one fixed sentinel.
The exact wrapper/form/control structure must remain byte-identical after this leaf and
after L02 changes the script owner. Do not compare render-current-to-render-current, hash
the output, use a snapshot, or include the mutable runtime-script bytes in this baseline.

## Regression-test shape

This leaf updates its one named compatibility-renderer suite before its source gate. It must prove:

- required is on the file input and absent from hidden;
- data-required-original and aria-required are owned by the raw file control and absent
  from the hidden companion for required and optional fixtures;
- raw input has no name;
- all three exact role attributes carry the same non-empty field identity, duplicates
  are absent for two server-normalized unique file fields, and single/multiple markers
  are exact/parity-safe on raw + hidden controls; accept is deterministic and raw-only;
- server-accepted slug collisions and cross-role suffix collisions allocate stable,
  globally unique ID families without changing the existing ordinary-field baseline;
- an outer-role collision with the form heading is also suffixed, while a reserved
  unauthored helper ID is never returned or referenced by aria-describedby;
- every `label[for]` and every aria-describedby token resolves exactly once to the
  intended field's allocated input/helper/status node in single- and multi-step output;
- helper plus status are referenced by aria-describedby;
- the single status/outcome node is neutral, polite, live, empty, and uniquely identified;
- its `empty:sr-only` class keeps the live region accessible while removing neutral
  normal-flow spacing and reveals automatically for non-empty runtime text; final
  TASK-536 smoke pins the computed neutral/progress/error/cleared geometry and position;
- for helper-bearing fields the status precedes the helper, so neutral rendering adds no
  Tailwind space-y trailing gap; the no-helper shape is pinned separately;
- the pre-pinned exact non-script representative HTML literal remains unchanged, including
  wrappers/form/non-file controls and the fixed script sentinel.

for each existing Form Embed, Contact, and Newsletter Forms-runtime security input:
- nonce hidden input keeps name `__nl_form_nonce` and adds exact
  `data-form-security-nonce="1"`;
- configured CAPTCHA compatibility hidden input keeps name `captchaToken` and adds exact
  `data-form-security-captcha="1"`;
- ordinary authored fields may retain either name and receive no security marker; no field
  name becomes newly reserved and no authoring surface changes;

TASK-536-05-L01 may add cross-runtime cases later but cannot re-baseline these DOM and
byte-identity assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/eslint --max-warnings=0 \
  core/widgets/core/formEmbed.tsx core/widgets/core/contact.tsx \
  core/widgets/core/newsletter.tsx
bunx vitest run --config vitest.config.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/contact.test.tsx \
  tests/vitest/widgets/newsletter.test.tsx
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- Native required validation can focus/report the actual file control.
- The named value can contain only runtime-owned media ID state.
- Multiple representation is explicit and cannot alter ordinary hidden fields.
