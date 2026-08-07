import { deepFreezeExact, invariant } from "./core.mjs";

export function selectorTemplate(parts, slots = [], optionalDefaults = {}) {
  invariant(
    Array.isArray(parts) &&
      parts.length === slots.length + 1 &&
      parts.every((part) => typeof part === "string") &&
      slots.every(
        (slot) =>
          slot &&
          Number.isInteger(slot.argIndex) &&
          slot.argIndex >= 0 &&
          slot.encoding === "css-string"
      ) &&
      optionalDefaults &&
      Object.getPrototypeOf(optionalDefaults) === Object.prototype,
    "selector template is invalid"
  );
  const arity = slots.length === 0 ? 0 : Math.max(...slots.map(({ argIndex }) => argIndex)) + 1;
  invariant(
    slots.length === 0 || new Set(slots.map(({ argIndex }) => argIndex)).size === arity,
    "selector arguments must be dense"
  );
  const optionalIndexes = Object.keys(optionalDefaults).map(Number);
  invariant(
    optionalIndexes.every(
      (index, offset) =>
        Number.isInteger(index) &&
        index === arity - optionalIndexes.length + offset &&
        typeof optionalDefaults[index] === "string"
    ),
    "selector optional arguments must be a dense trailing suffix"
  );
  return deepFreezeExact({
    kind: "selector-template",
    minArity: arity - optionalIndexes.length,
    maxArity: arity,
    parts,
    slots,
    optionalDefaults,
  });
}

export function staticSelector(value) {
  return selectorTemplate([value]);
}

// Widget hosts whose visible label is delegated to a CHILD element, so Playwright's
// :text-is() pseudo can never match the host itself: the text engine only accepts an
// element whose own text match is "self", and a child element carrying the same text
// downgrades that to "selfAndChildren". Radix/shadcn SelectItem renders its children
// inside <SelectPrimitive.ItemText> (core/admin/components/ui/select.tsx:92-117), which
// emits <div role="option" data-slot="select-item"><span .../><span>Label</span></div>.
// Such hosts must therefore be addressed through :has(span:text-is("...")), never by the
// host's own text. Only SelectItem wraps its children — Badge, DropdownMenuItem,
// TabsTrigger and Button all pass children through unwrapped — so this is a denylist of
// proven text-delegating hosts rather than an allowlist of safe ones. If another
// primitive starts wrapping, add its host token here with the same evidence.
//
// Sibling guard, different failure mode: shared widget classes such as [role="alert"] and
// [role="option"] are also unsafe to use in a page-wide ABSENCE check, because an unrelated
// instance the route mounts for its own reasons keeps the count above zero forever. That rule is
// enforced over the emitted browser sources by assertBrowserSourceWidgetAbsenceScope() in
// executor/self-test/browser-widget-absence-scope.mjs; keep the two token lists in step.
export const TEXT_DELEGATING_HOST_TOKENS = deepFreezeExact([
  '[role="option"]',
  '[data-slot="select-item"]',
]);

const TEXT_ENGINE_PSEUDO = ":text-is(";
const DELEGATED_TEXT_FORM = ':has(span:text-is("';

export function assertSelectorTextEngineShape(registry) {
  invariant(registry !== null && typeof registry === "object", "selector registry is absent");
  for (const [name, template] of Object.entries(registry)) {
    invariant(
      template !== null &&
        typeof template === "object" &&
        template.kind === "selector-template" &&
        Array.isArray(template.parts) &&
        template.parts.every((part) => typeof part === "string"),
      name + " selector template is invalid"
    );
    // Argument values are "css-string" leaves (block ids, labels, hrefs) and can never
    // contain a pseudo-class or an attribute-selector token, so joining the literal parts
    // with a neutral placeholder can neither fabricate nor hide a host/pseudo adjacency.
    // NUL is the placeholder because it is the one character a CSS selector can never
    // carry: a space would be a legal descendant combinator and could make the joined
    // literal read as a selector shape the template does not actually express.
    const literal = template.parts.join("\0");
    if (!literal.includes(TEXT_ENGINE_PSEUDO)) continue;
    for (const host of TEXT_DELEGATING_HOST_TOKENS) {
      invariant(
        !literal.includes(host + TEXT_ENGINE_PSEUDO),
        name + " selector addresses a text-delegating host by its own text"
      );
      invariant(
        !literal.includes(host) || literal.includes(host + DELEGATED_TEXT_FORM),
        name + " selector must match a delegated label through :has(span:text-is(...))"
      );
    }
  }
  return registry;
}

export function createSelectorRegistry() {
  const slot = (argIndex) => ({ argIndex, encoding: "css-string" });
  const registry = deepFreezeExact({
    loginEmail: staticSelector('input#email[name="email"][type="email"]'),
    loginPassword: staticSelector('input#password[name="password"][type="password"]'),
    loginSubmit: staticSelector('button[type="submit"]:text-is("Sign in")'),
    canvas: staticSelector('[data-screen-authoring-canvas="true"]'),
    blockRoot: selectorTemplate(['[data-screen-block-id="', '"]'], [slot(0)]),
    insertPanel: staticSelector('button[data-screen-toolbar-panel="insert"][aria-label="Insert"]'),
    blockLibrary: staticSelector('[data-screen-block-library="true"]'),
    palette: selectorTemplate(
      ['div[data-screen-block-library="true"] button:text-is("', '")'],
      [slot(0)]
    ),
    selectBlock: selectorTemplate(['button[data-screen-select-block="', '"]'], [slot(0)]),
    buttonAffordance: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-screen-button-affordance="true"]'],
      [slot(0)]
    ),
    boundField: staticSelector('[data-screen-bound-field="true"]'),
    fieldOption: selectorTemplate(
      ['[role="option"]:has(span:text-is("', " (", ')"))'],
      [slot(0), slot(1)]
    ),
    staticLink: staticSelector('button:text-is("Use static link")'),
    staticLinkInput: staticSelector('input[placeholder="https://…"]'),
    paragraph: staticSelector('textarea[placeholder="Paragraph text"]'),
    tabLabel: selectorTemplate(['[data-screen-tab-label="', '"]'], [slot(0)]),
    editTab: selectorTemplate(['button[aria-label="Edit content for ', '"]'], [slot(0)]),
    addTab: staticSelector('button:text-is("Add tab")'),
    runtimeTab: selectorTemplate(['[role="tab"]:text-is("', '")'], [slot(0)]),
    scopedRuntimeTab: selectorTemplate(
      ["", ' [data-screen-block-id="', '"] [role="tab"]:text-is("', '")'],
      [slot(2), slot(0), slot(1)],
      { 2: "" }
    ),
    previewRuntimeTab: selectorTemplate(
      [
        '[data-preview-shell="roomy"] [data-preview-device="desktop"] [data-screen-block-id="',
        '"] [role="tab"]:text-is("',
        '")',
      ],
      [slot(0), slot(1)]
    ),
    runtimePanel: selectorTemplate(
      ['[role="tabpanel"][data-screen-runtime-tab="', '"]'],
      [slot(0)]
    ),
    builderSave: staticSelector('button:text-is("Save")'),
    preview: staticSelector('button:text-is("Preview")'),
    previewShell: staticSelector('[data-preview-shell="roomy"] [data-preview-device="desktop"]'),
    previewClose: staticSelector('[data-preview-shell="roomy"] button[data-slot="dialog-close"]'),
    keepEditing: staticSelector('button:text-is("Keep editing")'),
    discard: staticSelector('button:text-is("Discard and continue")'),
    entrySave: staticSelector('button:text-is("Save")'),
    presentationSave: staticSelector('button:text-is("Save presentation")'),
    presentationClear: staticSelector('button:text-is("Clear selected presentation")'),
    relatedListRoot: selectorTemplate(['[data-screen-block-id="', '"]'], [slot(0)]),
    relatedRow: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-screen-related-entry="', '"]'],
      [slot(0), slot(1)]
    ),
    relatedSkeletonChip: selectorTemplate(
      ['[data-screen-block-id="', '"] span:text-is("Chip")'],
      [slot(0)]
    ),
    relatedEmpty: selectorTemplate(
      ['[data-screen-block-id="', '"] p:text-is("No related ', '.")'],
      [slot(0), slot(1)]
    ),
    fieldBadge: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-slot="badge"]:text-is("', '")'],
      [slot(0), slot(1)]
    ),
    relatedAlert: staticSelector(
      '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))'
    ),
    relatedRetry: staticSelector(
      '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable")) button:text-is("Retry")'
    ),
    metadata: staticSelector('button[aria-label="Show field metadata"]'),
    browseMedia: staticSelector(
      '[data-custom-screen-entry-presentation-panel="true"] button:text-is("Browse media")'
    ),
    mediaCard: selectorTemplate(['button:has(p:text-is("', '"))'], [slot(0)]),
    relationEntry: selectorTemplate(
      ['[data-screen-block-id="', '"] button:has(p:text-is("', '"))'],
      [slot(0), slot(1)]
    ),
    contentEditable: selectorTemplate(
      ['[data-screen-block-id="', '"] [role="textbox"][aria-label="', '"]'],
      [slot(0), slot(1)]
    ),
    toneTrigger: staticSelector('[data-presentation-control="tone"] button[role="combobox"]'),
    // The tone option is a Radix/shadcn SelectItem, so its "Muted" label lives in the
    // nested <SelectPrimitive.ItemText> span and the [role="option"] host carries no
    // direct text node. `[role="option"]:text-is("Muted")` therefore matches 0 nodes;
    // the label has to be reached through the child span, exactly as `fieldOption`
    // above already does for the same widget class. Do not "simplify" this back.
    muted: staticSelector('[role="option"]:has(span:text-is("Muted"))'),
    recordsLink: selectorTemplate(
      ['a[href="/admin/advanced/custom-screens/', '/entries"]'],
      [slot(0)]
    ),
    recordActions: staticSelector('button[aria-label="Record actions"]'),
    editRecord: staticSelector('[role="menuitem"]:text-is("Edit record")'),
    builderLink: selectorTemplate(['a[href="/admin/advanced/custom-screens/', '"]'], [slot(0)]),
    userMenu: selectorTemplate(
      ['header button:has(span.block.text-sm:text-is("', '"))'],
      [slot(0)]
    ),
    bootstrapUserMenu: staticSelector(
      'header button[data-slot="dropdown-menu-trigger"]:has(span.block.text-sm)'
    ),
    signOut: staticSelector('[role="menuitem"]:text-is("Sign out")'),
    colorMode: staticSelector('button[aria-label="Toggle dark mode"]'),
    panelHide: staticSelector('button[aria-label="Hide panel"][aria-pressed="true"]'),
    panelShow: staticSelector('button[aria-label="Show panel"][aria-pressed="false"]'),
    canvasScroller: staticSelector('[data-screen-editor-canvas-scroller="true"]'),
    editorPanel: staticSelector('[data-screen-editor-panel="true"][role="region"]'),
    secondTabTitle: staticSelector('textarea[placeholder="Enter post title..."]'),
    secondTabSave: staticSelector('button:text-is("Save draft")'),
  });
  return assertSelectorTextEngineShape(registry);
}
