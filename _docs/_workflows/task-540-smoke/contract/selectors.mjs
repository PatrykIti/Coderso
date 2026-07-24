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

export function createSelectorRegistry() {
  const slot = (argIndex) => ({ argIndex, encoding: "css-string" });
  return deepFreezeExact({
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
    muted: staticSelector('[role="option"]:text-is("Muted")'),
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
}
