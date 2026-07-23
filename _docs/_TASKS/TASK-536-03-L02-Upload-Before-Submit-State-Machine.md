# TASK-536-03-L02: Upload-Before-Submit State Machine

# FileName: TASK-536-03-L02-Upload-Before-Submit-State-Machine.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-03
**Priority:** Critical
**Category:** Public Forms Runtime / Reliability / Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-536-03-L01
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

---

## Scope

Add a deterministic per-field upload state machine to the static Forms runtime. It
uploads current FileList entries to /forms/:id/uploads before constructing the final
submission JSON, preserves order, retries safely, and never advances with stale IDs.

This is browser-runtime repair for existing public block/section renderers in the
historical `core/widgets` namespace (`form-embed`, `contact`, and `newsletter`). It adds
no non-dashboard widget type, editor/wizard/visual control, authoring workflow,
registry/module-pack entry, preset, or new block/section type.

## Source ownership

This leaf is the sole writer of core/widgets/core/formRuntimeScript.ts for TASK-536 and
owns the changed-behavior/compatibility assertions required before its gate in
tests/vitest/widgets/formRuntimeScript.test.ts. It consumes the L01 DOM contract and
must not edit formEmbed.tsx, routes/services, other tests, docs, task indexes, or
changelog files. TASK-536-05-L01 may add later cross-contract cases but cannot
re-baseline these assertions.

## Implementation Pseudocode

~~~ts
type FileFieldState = {
  generation: number;
  phase: "idle" | "selected" | "uploading" | "complete" | "error";
  files: File[]; // exact ordered File object identities owned by this generation
  ids: string[];
  error: string | null;
  promise: Promise<string[]> | null;
  abortController: AbortController | null; // transport aid; generation remains authority
};

type FileBindingSignature = Readonly<{
  form: HTMLFormElement;
  input: HTMLInputElement; // repeated explicitly so stale cleanup can guard its status target
  identity: string;
  hidden: HTMLInputElement;
  status: HTMLElement;
  multiple: boolean;
}>;

type FileFieldStateOwner = {
  signature: FileBindingSignature;
  state: FileFieldState;
};

type FileBinding = Readonly<{
  form: HTMLFormElement; // immutable captured owner, never re-derived from mutable input.form
  identity: string;
  input: HTMLInputElement;
  hidden: HTMLInputElement;
  status: HTMLElement;
  multiple: boolean;
  state: FileFieldState;
}>;

type FileBindingRegistry = Readonly<{
  valid: readonly FileBinding[];
  bindingByHidden: WeakMap<HTMLInputElement, FileBinding>;
  bindingByInput: WeakMap<HTMLInputElement, FileBinding>;
  invalidIdentities: readonly string[];
  markerElements: readonly Element[];
}>;

type PreparedFileSnapshot = Readonly<{
  binding: FileBinding;
  generation: number;
  visible: boolean;
  files: readonly File[];
  ids: readonly string[];
}>;

type PublicWriteContext = Readonly<{
  formId: string;
  formNonce: string;
  uploadUrl: string;
  submissionUrl: string;
  captchaSiteKey: string;
  captchaAction: "public_write";
}>;

type FormFileUiState = {
  submitting: boolean;
  bindingInvalid: boolean;
  pendingUploads: Set<Promise<string[]>>;
  submissionController: AbortController | null;
};

const fileBindingRegistryByForm = new WeakMap<HTMLFormElement, FileBindingRegistry>();
const fileFieldStateByInput = new WeakMap<HTMLInputElement, FileFieldStateOwner>();
const fileMarkerTombstones = new WeakSet<Element>();
const formFileUiStateByForm = new WeakMap<HTMLFormElement, FormFileUiState>();

function syncFormActionState(form) {
  ui = get/create { submitting: false, bindingInvalid: false, pendingUploads: Set(),
    submissionController: null };
  disabled = ui.submitting || ui.bindingInvalid || ui.pendingUploads.size > 0;
  keep form.dataset.submitting exactly "1"/"0" from ui.submitting for compatibility;
  set submit/Next/Back disabled from this one derived value;
  set form/button aria-busy from ui.submitting || ui.pendingUploads.size > 0;
  expose data-file-binding-invalid and data-file-upload-pending as exact "0"/"1" for
    observable DOM state; do not expose filenames, ids, tokens, or errors in datasets;
  preserve the existing submit-label behavior from ui.submitting only;
  never let one promise's finally enable actions while another reason remains active;
}

function abortActiveSubmission(form) {
  ui = formFileUiStateByForm.get(form);
  ui?.submissionController?.abort();
  // The attempt's catch/finally owns bounded copy and identity-guarded UI cleanup.
}

function resolveSafeFileStatusTarget(bindingOrSignature): HTMLElement | null {
  read the immutable captured form from the binding/signature, never current input.form;
  recompute the strict distinct `[data-form-field]` ancestor relation from the current
    raw/hidden/status DOM immediately; require owner contains all roles, status contains
    no Element child, and status is not form/owner/raw/hidden; require input.form,
    hidden.form, every role's closest("form"), owner's closest("form"), and form containment
    all still equal that exact captured form;
  return status only when safe, otherwise null without mutating any descendant;
}

function setFileStatus(bindingOrSignature, phase, safeText = ""): boolean {
  status = resolveSafeFileStatusTarget(bindingOrSignature);
  if status is null: return false without textContent/role/aria writes;
  write status.textContent only after that immediate guard;
  for error: role="alert", aria-live="assertive", bounded constant copy;
  for neutral/progress/success: role="status", aria-live="polite";
  clearing text reactivates L01 empty:sr-only automatically; never toggle hidden/classes;
  return true;
}

function failUnsafeFileStatusTarget(form, bindingOrSignature): never {
  abort the binding transport and active submission; increment/invalidate generation;
  set phase to selected when the exact FileList remains otherwise idle (never complete or
    error), clear ids/hidden/error-facing terminal state without touching status descendants;
  set ui.bindingInvalid = true, render only the fixed FILE_BINDING_ERROR in the existing
    form error node, mark that node's error owner as `"file-binding"`, and
    syncFormActionState so Submit/Back/Next remain disabled;
  always execute the literal `throw createSafeUploadError("file_selection_changed")` so
    upload control flow
    terminates at every call site; only a later real event/reset registry recomputation after DOM repair may clear
    bindingInvalid and re-enable actions;
}

No source path writes status text/role/aria outside this helper. Progress checks it before
starting transport. Completion and error check it again after every captcha/fetch/JSON
await and before committing terminal ids/hidden/phase; an unsafe target invalidates the
attempt, keeps/returns hidden IDs neutral, initiates no final submission, skips the status
write, sets bindingInvalid until repair, and surfaces only bounded form-level failure.
Reset, conditional clear, signature
rotation, tombstone invalidation, and stale-owner `clearSignatureDom` also use the helper;
if unsafe they may clear owned state/hidden values but must preserve all status descendants
and skip status mutation rather than throwing through an event boundary.

function awaitWithAbort(promise, signal) {
  if signal.aborted: reject safe file_selection_changed immediately;
  race the promise with one once-only abort listener, remove the listener on settlement,
    and ignore any late captcha result; never expose AbortError/raw rejection text;
}

function resetFileStateToNeutral(binding, { clearNative }) {
  abort controller; generation++;
  if clearNative: binding.input.value = "";
  phase = "idle"; files = []; ids = []; error = null; promise = null;
  abortController = null; hidden = ""; setFileStatus(binding, "neutral", "");
}

function failFileStateLocally(binding, safeCode) {
  abort controller; generation++;
  phase = "error"; files = Array.from(binding.input.files ?? []); ids = [];
  error = safeCode; promise = null; abortController = null; hidden = "";
  if setFileStatus(binding, "error", SAFE_UPLOAD_COPY[safeCode] ?? default copy) is false:
    failUnsafeFileStatusTarget(binding.form, binding);
  return the corresponding safe Error for the caller to throw;
}

function capturePublicWriteContext(form): PublicWriteContext | null {
  read exactly one non-empty, whitespace-canonical form.dataset.formId and
    __nl_form_nonce value; leading/trailing whitespace is invalid rather than trimmed;
  build exact expected upload/submission path strings from encoded formId, then construct
    URLs from those paths + window.location.origin;
  require both origins are exactly window.location.origin, each URL pathname is byte-for-byte
    its expected path, both search/hash components are empty, and the current normalized
    form.action equals the built submission URL; reject dot-segment normalization such as
    formId "." or ".." and return null on any mismatch;
  snapshot the exact whitespace-canonical captcha site-key bytes and fixed action
    "public_write"; normalize only a literally empty emitted captcha-action dataset to
    "public_write", accept the exact literal, and reject whitespace-padded/other actions;
  return one frozen context used by every upload and the final submission;
}

function failWriteContextLocally(form, registry, safeCode) {
  apply failFileStateLocally to each visible selected file binding;
  show one bounded fixed form error for forms without a selected file; return null;
  never throw past the submit event boundary or initiate a request;
}

function assertPublicWriteContextStillCurrent(form, context) {
  require live raw form id, nonce, normalized action URL, captcha site-key bytes, and
    action bytes (using only the literal empty -> public_write normalization) still equal
    the captured context byte-for-byte; do not trim either side;
  reject safe file_selection_changed on any drift;
}

function getOrCreateFileFieldState(input, signature): FileFieldState {
  owner = fileFieldStateByInput.get(input);
  if owner exists and every signature member is identical: return owner.state;
  if owner exists with a changed form/identity/hidden/status/multiple member:
    abortActiveSubmission(owner.signature.form);
    abort its controller, increment generation, clear files/ids/error/promise-facing state,
      clear its old hidden/status DOM, and leave any old captured promise able only to
      reject as stale and identity-check its own cleanup;
  create a fresh { generation: 0, phase: "idle", files: [], ids: [], error: null,
    promise: null, abortController: null } state, clear the new signature's hidden/status DOM, store
    { signature, state } under this native input, and return state;
}

function invalidateAndDeleteFileFieldState(input, expectedForm) {
  if the current owner exists and owner.signature.form === expectedForm:
    abortActiveSubmission(expectedForm);
    abort owner.state controller, increment owner.state generation, clear its
      files/ids/error/promise-facing state
      and old hidden/status DOM;
    fileFieldStateByInput.delete(input);
}

function sameOrderedFiles(left, right) {
  return equal lengths and left[index] === right[index] for every index;
}

function serializeFileIds(binding, ids) {
  require every id matches the exact UUID syntax and ids length matches selected files;
  require binding.multiple || ids.length <= 1;
  return binding.multiple ? JSON.stringify(ids) : ids[0] ?? "";
}

function decodeFileHiddenValue(binding) {
  raw = binding.hidden.value;
  if raw === "": return binding.multiple ? [] : ""; // neutral is valid and absent
  if !binding.multiple: return UUID-shaped raw only, otherwise FILE_VALUE_INVALID;
  parse JSON without throwing past this helper; require a canonical JSON string array of
    UUIDs (`JSON.stringify(parsed) === raw`), otherwise return FILE_VALUE_INVALID;
}

function synchronizeSilentSelectionChange(binding) {
  state = binding.state;
  currentFiles = Array.from(binding.input.files ?? []);
  if state.phase is uploading or complete and !sameOrderedFiles(currentFiles, state.files):
    generation++, phase = currentFiles.length ? "selected" : "idle";
    abort controller; files = []; ids = []; error = null; promise = null;
      abortController = null; hidden = ""; clear status;
  // The old captured promise now has only stale-generation cleanup authority.
}

function hasCanonicalStateValue(binding) {
  state = binding.state;
  if state.phase === "complete":
    require sameOrderedFiles(Array.from(binding.input.files ?? []), state.files) and
      binding.hidden.value === serializeFileIds(binding, state.ids);
  else require binding.hidden.value === "";
  return decodeFileHiddenValue(binding) !== FILE_VALUE_INVALID;
}

function recomputeFileBindingRegistry(form): FileBindingRegistry {
  previousRegistry = fileBindingRegistryByForm.get(form);
  collect the form root plus every descendant Element (HTML, SVG, MathML, or other)
    carrying data-form-file-input, data-form-file-value, data-form-file-status, or
    data-form-file-multiple, including empty marker values; never filter discovery to
    HTMLElement;
  add every collected Element to fileMarkerTombstones before validating it;
  group non-empty identities without pairing by DOM order;
  require exactly one input, one hidden value, and one status for each identity;
  require the input role is an HTMLInputElement with type === "file";
  require the hidden role is a distinct HTMLInputElement with type === "hidden";
  require the status role is a distinct non-input HTMLElement; allow its runtime
    pair only as role=status/aria-live=polite or role=alert/aria-live=assertive;
  require one HTMLElement `[data-form-field]` owner that is a strict, distinct ancestor
    of and contains raw, hidden, and status: owner is not form/raw/hidden/status, each
    role's closest field container is that owner, and the text-only status has
    childElementCount === 0 (it contains no form control, field, wrapper, or other Element);
    the form root, a role node promoted to wrapper, or an unrelated field/wrapper can never
    become the writable status target;
  require hidden.name === identity and reject empty/mismatched/duplicate markers;
  require raw and hidden data-form-file-multiple are each exactly "0" or "1",
    are equal, and equal (input.multiple ? "1" : "0"); status has no multiple marker;
  require exact marker-role exclusivity: raw has input+multiple only, hidden has
    value+multiple only, and status has status only among all data-form-file-* markers;
  for each exact validated triple create one immutable binding whose captured form,
    identity, and
    multiple flag is copied from that validated native input only after marker parity,
    and whose state is getOrCreateFileFieldState(input, full binding signature including
    that same input reference); every
    registry recompute that reuses the same native input and exact signature therefore
    reuses the same generation/promise state, while any signature change rotates state;
  synchronizeSilentSelectionChange(binding), then require hasCanonicalStateValue(binding);
    malformed non-empty JSON, foreign IDs, or state/value mismatch joins bounded
    invalidIdentities instead of throwing, and that binding is not added to valid;
  after validation, invalidateAndDeleteFileFieldState for every native input from the
    previous registry that is absent from this registry's exact valid-input set, including
    roles made malformed or stripped of all markers while an upload was in flight;
  build bindingByHidden from each exact hidden companion and bindingByInput from each
    exact native file input to that full binding;
  capture markerElements as the frozen source-order snapshot collected at the start;
  registry = frozen valid bindings + bindingByHidden + bindingByInput + bounded frozen
    invalid identity labels + frozen markerElements;
  fileBindingRegistryByForm.set(form, registry);
  return registry; // never silently ignore a malformed marker-bearing element
}

function requireValidFileBindings(form): FileBindingRegistry | null {
  registry = recomputeFileBindingRegistry(form);
  if registry.invalidIdentities is non-empty:
    abortActiveSubmission(form);
    set ui.bindingInvalid = true, announce the fixed bounded file-binding form alert,
      mark the existing form error node owner as "file-binding", and syncFormActionState(form);
    return null before navigation/upload/submission without throwing at an event boundary;
  clear only a form error explicitly owned by file-binding validation;
  set ui.bindingInvalid = false and syncFormActionState(form);
  return registry;
}

function invalidateFileSelection(form, binding, registry) {
  abortActiveSubmission(form);
  state = binding.state; // stable WeakMap-owned state, never transient binding identity
  state.abortController?.abort(); state.abortController = null;
  state.generation += 1;
  state.phase = binding.input.files.length ? "selected" : "idle";
  state.files = [];
  state.ids = [];
  state.error = null;
  binding.hidden.value = "";
  clear bounded status/error;
  persistProgress(form, registry) without File or hidden media-ID values;
}

function clearFileBindingForInvisibility(form, binding, registry) {
  if native value, hidden value, state, and status are already neutral: return before
    aborting the form submission or mutating DOM;
  abortActiveSubmission(form);
  resetFileStateToNeutral(binding, { clearNative: true });
  // Native FileList is cleared; hidden fields cannot resurrect it.
  persistProgress(form, registry) without either file representation;
}

function resetFileBinding(binding) {
  resetFileStateToNeutral(binding, { clearNative: true });
  clear bounded error/progress styling without moving focus;
}

const SAFE_UPLOAD_COPY = fixed code map:
  media_file_too_large -> "The selected file is too large.";
  media_mime_not_allowed -> "This file type is not allowed.";
  form_field_invalid -> "This file cannot be uploaded for this field.";
  form_not_found -> "This form is no longer available.";
  form_upload_invalid -> "This file cannot be uploaded right now.";
  form_nonce_required/form_nonce_invalid/form_nonce_expired ->
    "This form has expired. Refresh the page and try again.";
  rate_limited -> "Too many uploads. Please try again later.";
  bot_protection_required/bot_protection_failed/bot_protection_action_mismatch/
    bot_protection_score_low/bot_protection_unavailable/bot_protection_missing_keys ->
    "Upload verification failed. Please try again.";
  file_selection_changed -> "Your file selection changed. Submit the form again.";
  file_selection_invalid -> "Choose a valid file selection and try again.";
  default -> "Unable to upload this file. Please try again.";

function toSafeUploadError(responseOrError) {
  read only a bounded machine code from JSON; never use server message, filename, URL,
    provider detail, response body text, or arbitrary thrown message as visible copy;
  return an Error carrying only the selected constant code/copy.
}

const SAFE_SUBMISSION_COPY = fixed code map:
  form_not_found -> "This form is no longer available.";
  form_nonce_required/form_nonce_invalid/form_nonce_expired ->
    "This form has expired. Refresh the page and try again.";
  rate_limited -> "Too many submissions. Please try again later.";
  bot_protection_required/bot_protection_failed/bot_protection_action_mismatch/
    bot_protection_score_low/bot_protection_unavailable/bot_protection_missing_keys ->
    "Form verification failed. Please try again.";
  file_selection_changed -> "Your file selection changed. Submit the form again.";
  default -> "Unable to submit the form. Please try again.";

function toSafeSubmissionError(responseOrError) {
  read only a bounded allowlisted machine code from response.error.code or a locally
    branded safe error; never use response.error.message, response text, arbitrary thrown
    Error.message, captcha/provider detail, filename, URL, or HTML as visible copy;
  return an Error carrying only the selected constant code/copy.
}

const MAX_FILES_PER_FIELD = 20; // exact parity with L02's bounded submission array

function isFileBindingStructurallyVisible(binding) {
  require raw, hidden, status, and their one strict field owner still belong to and are
    contained by immutable binding.form using the same input.form/hidden.form/
    closest("form") checks as the status guard; then require the captured-form field owner
    has exact data-logic-visible/hidden coherence;
  return only that structural visibility result; disabled state is not folded into the
    meaning of visible.
}

function isFileBindingUploadable(binding) {
  return isFileBindingStructurallyVisible(binding) && !binding.input.disabled &&
    !binding.hidden.disabled;
  // The final live-registry check separately requires both disabled flags === !visible.
}

async function uploadCurrentSelection(form, binding, registry, writeContext) {
  state = binding.state;
  ui = get/create formFileUiStateByForm entry;
  if !isFileBindingUploadable(binding):
    clearFileBindingForInvisibility(form, binding, registry); return [];
  files = Array.from(binding.input.files ?? []);
  if !binding.multiple and files.length > 1:
    throw failFileStateLocally(binding, "file_selection_invalid");
  if files.length > MAX_FILES_PER_FIELD:
    throw failFileStateLocally(binding, "file_selection_invalid") before captcha,
      upload transport, or final submission; keep hidden ids neutral and retryable;
  if files is empty:
    if binding.input.required: report native validity and
      throw failFileStateLocally(binding, "file_selection_invalid");
    resetFileStateToNeutral(binding, { clearNative: false }); return [];

  if state.phase === "uploading" and sameOrderedFiles(files, state.files):
    return state.promise;
  if state.phase === "complete" and sameOrderedFiles(files, state.files):
    require binding.hidden.value === serializeFileIds(binding, state.ids);
    return [...state.ids];
  if state.phase is uploading or complete with different File objects:
    abort controller; generation++, phase = "selected", files = [], ids = [],
      error = null, promise = null, abortController = null, hidden = ""; clear status only
      through guarded setFileStatus, otherwise preserve descendants and mark binding invalid;
      // silently replaced FileList must upload again

  generation = state.generation;
  if setFileStatus(binding, "progress", bounded progress copy) is false:
    failUnsafeFileStatusTarget(form, binding);
  state.phase = "uploading";
  state.files = [...files];
  state.ids = [];
  state.error = null;
  controller = new AbortController(); state.abortController = controller;
  capturedPromise = async inner upload operation:
    ids = [];
    for file in files in order:
      captchaToken = writeContext.captchaSiteKey
        ? await awaitWithAbort(
            executeRecaptcha(writeContext.captchaSiteKey, writeContext.captchaAction),
            controller.signal)
        : null;
      if generation/files no longer match: reject safe file_selection_changed;
      body = new FormData();
      body.append("fieldName", binding.identity);
      body.append("file", file, file.name);
      body.append("formNonce", writeContext.formNonce);
      if captchaToken is a non-empty string: body.append("captchaToken", captchaToken);
      response = await fetch(writeContext.uploadUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        body,
      }); // never set multipart Content-Type manually
      result = await response.json().catch(() => null);
      if !response.ok: throw toSafeUploadError(result?.error?.code);
      if generation/files no longer match: reject safe file_selection_changed;
      require result.id matches exact UUID syntax; append id;
    on success while generation and exact state.files still match:
      serialized = serializeFileIds(binding, ids);
      if setFileStatus(binding, "complete", bounded completion copy) is false:
        failUnsafeFileStatusTarget(form, binding);
      // no await/event boundary from the successful guard through this commit
      state.ids = [...ids]; state.error = null; binding.hidden.value = serialized;
      state.phase = "complete"; return [...state.ids];
    on stale generation/File objects:
      reject safe file_selection_changed without writing newer hidden/status/error state;
    on other failure while generation still matches:
      safeError = toSafeUploadError(error);
      if setFileStatus(binding, "error", safeError fixed copy) is false:
        failUnsafeFileStatusTarget(form, binding);
      // no await/event boundary from the successful guard through this commit
      state.files = [...files]; state.ids = [];
      state.error = safeError.code; binding.hidden.value = "";
      state.phase = "error"; throw safeError;
  state.promise = capturedPromise;
  ui.pendingUploads.add(capturedPromise); syncFormActionState(form);
  try:
    return await capturedPromise;
  finally:
    ui.pendingUploads.delete(capturedPromise);
    if state.promise === capturedPromise: state.promise = null;
    if state.abortController === controller: state.abortController = null;
    syncFormActionState(form); // derives all remaining disable reasons
}

function preflightFileCardinality(form, registry) {
  synchronously inspect every structurally visible and uploadable valid binding before
    starting any upload;
  capture its current FileList and reject through failFileStateLocally when a single-file
    binding has >1 or any binding has >MAX_FILES_PER_FIELD;
  complete this whole-form pass with no await, captcha, fetch, hidden-id commit, or
    submission write; retain the per-binding checks in uploadCurrentSelection as defense
    against later silent FileList drift;
}

async function prepareFilesBeforeSubmission(
  form, registry, writeContext
): Promise<PreparedFileSnapshot[]> {
  preflightFileCardinality(form, registry);
  for every registry.valid binding, including ones whose visibility/disabled state may
    have drifted while an earlier upload awaited:
    await uploadCurrentSelection(form, binding, registry, writeContext);
  require every structurally visible binding with a selected FileList is complete for its current
    generation, including optional fields; require every required binding complete;
  return one snapshot for every valid binding with visibility, generation, ordered File
    object identities, and canonical ids after all uploads finish;
}

function validateLiveFileRegistry(form, registry) {
  reuse the exact same root-inclusive, all-Element collector as registry recomputation to
    rescan every current known marker without committing/replacing the registry;
  require no extra/missing marker element or identity and exact same input/hidden/status
    element references as registry.valid;
  recheck element roles/types/distinctness, containment/form ownership, every marker byte,
    hidden.name, native/raw/hidden multiple parity, status marker exclusions, and raw-only
    required/data-required-original/aria-required semantics; require an exact current
    `[data-form-field]` container whose data-logic-visible is exactly "0" or "1" and whose
    `hidden` property equals (data-logic-visible === "0"); define visible from that coherent
    pair; require raw, hidden, and status retain that same strict, distinct ancestor
    `[data-form-field]` owner and require the status remains element-child-free; require
    raw.required === (visible && authoredRequired), keep raw aria-required
    equal the authored requirement even while hidden, and require both raw and hidden
    `disabled` exactly equal `!visible` (not merely equal each other), so a visually exposed
    or hidden container cannot drift into the opposite serialization state; require the same exact marker-role
    exclusivity (no known role element may gain a second file-role marker);
  require each binding's current hidden value is canonical for its state and exact ids;
  require conditional visibility/disabled state is coherent and hidden companions are
    never required; return false rather than normalizing or throwing raw DOM values;
}

function assertPreparedFilesStillCurrent(form, registry, snapshots) {
  require fileBindingRegistryByForm.get(form) === registry;
  require validateLiveFileRegistry(form, registry) is true;
  require every snapshot binding remains connected to this form with the exact current
    visibility, generation, ordered File object identities in both FileList and
    state.files, phase/required completeness, ids, and canonical hidden encoding;
  on any mismatch throw bounded file_selection_changed before payload/fetch;
}

function readNamedValue(input, registry) {
  binding = registry.bindingByHidden.get(input);
  if input carries any data-form-file-* marker and binding is undefined:
    return SKIP_VALUE;
  if binding is defined:
    if input !== binding.hidden or input.name !== binding.identity: return SKIP_VALUE;
    decoded = decodeFileHiddenValue(binding);
    return decoded === FILE_VALUE_INVALID ? SKIP_VALUE : decoded;
    // Multiple "" is the valid neutral [] shape; malformed non-empty JSON never throws.
  preserve existing behavior for every other input;
}

function readFormSecurityControls(form, captchaSiteKey) {
  collect all elements carrying data-form-security-nonce or data-form-security-captcha;
  require exactly one nonce marker on a native hidden input owned by this form, with
    marker value "1" and name "__nl_form_nonce";
  require exactly one equally strict CAPTCHA marker named "captchaToken" when a site key
    is configured, otherwise require zero CAPTCHA markers;
  reject duplicate, cross-role, malformed, wrong-owner, wrong-type, or moved markers;
  return the exact input references; ordinary fields with either name but no security
    marker remain ordinary dynamic fields;
}

function setOwnDynamicValue(target, key, value) {
  Object.defineProperty(target, key, {
    value, enumerable: true, writable: true, configurable: true,
  });
}

function getFormFields(form, registry) {
  exclude every native input[type=file] regardless of name or marker state;
  before tombstone/marker exclusion, admit an exact current validated hidden companion
    when registry.bindingByHidden.get(element) returns its binding and it retains the
    binding's non-empty identity name;
  for every element that is not that exact current companion, exclude every
    fileMarkerTombstones element even after all markers/name are mutated and exclude every
    currently marker-bearing element;
  exclude only exact validated security-role inputs by their marker/reference, never all
    controls merely because their names are `__nl_form_nonce` or `captchaToken`;
  preserve ordinary named-control filtering;
}

function collectValues(form, registry) {
  iterate getFormFields(form, registry);
  pass this same registry to every readNamedValue call;
  skip SKIP_VALUE rather than treating it as an ordinary hidden value;
  write every dynamic name through setOwnDynamicValue and use Object.hasOwn when reading
    conditional values so inherited built-ins are never data;
}

function refreshConditionalFields(form, registry) {
  values = collectValues(form, registry);
  evaluate conditional visibility from values;
  clear newly hidden file selections through clearFileBindingForInvisibility so native
    input.value/FileList, files, ids, hidden, promise-facing state, and status all reset;
}

function persistProgress(form, registry) {
  iterate getFormFields(form, registry);
  omit native File values and every input present in registry.bindingByHidden;
  pass registry to every other readNamedValue call;
  write dynamic names through setOwnDynamicValue;
  persist only the existing safe progress shape;
}

function hydrateProgress(form, registry) {
  accept a saved dynamic value only when Object.hasOwn(values, field.name);
  never hydrate Object.prototype members for absent magic-named fields;
}

function validateCurrentStep(form, registry) {
  validate current controls using collectValues(form, registry);
}

function validateStepsThroughCurrent(form, registry) {
  validate each eligible step using collectValues(form, registry);
}

function toPayload(form, registry, writeContext, finalCaptchaToken) {
  iterate getFormFields(form, registry);
  readNamedValue(field, registry);
  setOwnDynamicValue(data, field.name, value);
  set formNonce only from writeContext.formNonce and captchaToken only from the local
    finalCaptchaToken (when non-empty), never reread mutable hidden controls here;
}

on runtime initialization:
  registry = recomputeFileBindingRegistry(form);
  apply its valid/invalid UI state through ui.bindingInvalid + syncFormActionState;
  hydrate progress with this registry, excluding File/tombstoned/companion values;
  only when valid, refreshConditionalFields(form, registry);

on every relevant input/change event:
  abortActiveSubmission(form) when an attempt is active, before recomputation;
  registry = requireValidFileBindings(form); // exactly once for this event
  if registry is null: return after the blocking UI update, without an uncaught exception;
  if this is a validated native file input:
    invalidateFileSelection(form, its binding, registry);
  refreshConditionalFields(form, registry);
  persistProgress(form, registry);

on native/programmatic form reset (including show-message-reset-form success):
  abortActiveSubmission(form) synchronously in the reset event;
  schedule one post-native-reset microtask (the reset event fires before control defaults):
    registry = recomputeFileBindingRegistry(form);
    for every registry.valid binding: resetFileBinding(binding);
    apply invalid-registry UI state fail closed and refresh conditional/step UI if valid;
    never restore stale progress media IDs or set the hidden companion required;

on Next:
  if ui.submitting or ui.pendingUploads is non-empty: return before recomputation;
  registry = requireValidFileBindings(form); // exactly once for this event
  if registry is null: return without advancing or throwing;
  refreshConditionalFields(form, registry);
  validateCurrentStep(form, registry);
  persistProgress(form, registry);
  only then advance;

on Back:
  if ui.submitting or ui.pendingUploads is non-empty: return before recomputation;
  registry = requireValidFileBindings(form); // exactly once for this event
  if registry is null: return without navigating or throwing;
  refreshConditionalFields(form, registry);
  persistProgress(form, registry);
  only then move back;

on submit:
  prevent default;
  if ui.submitting is already true: return before registry recomputation or any mutation;
  registry = requireValidFileBindings(form) exactly once before validation or busy state;
  if registry is null: return without upload/submission or throwing;
  refreshConditionalFields(form, registry);
  if validateStepsThroughCurrent(form, registry) is false: return;
  writeContext = capturePublicWriteContext(form); // once for the whole attempt
  if writeContext is null:
    failWriteContextLocally(form, registry, missing nonce vs other safe code); return;
  attemptController = new AbortController();
  ui.submissionController = attemptController;
  set ui.submitting = true and syncFormActionState(form);
  preparedFiles = await prepareFilesBeforeSubmission(form, registry, writeContext);
  finalCaptchaToken = writeContext.captchaSiteKey
    ? await awaitWithAbort(executeRecaptcha(writeContext.captchaSiteKey,
        writeContext.captchaAction), attemptController.signal)
    : null;
  map configured-captcha rejection to the fixed bot-protection submission copy and do not
    trust a later hidden read; an unconfigured captcha performs no provider call and emits
    no token;
  assertPublicWriteContextStillCurrent(form, writeContext);
  assertPreparedFilesStillCurrent(form, registry, preparedFiles);
  payload = toPayload(form, registry, writeContext, finalCaptchaToken);
  toPayload defines every dynamic field name as an enumerable own data property instead
    of bracket-assigning into an ordinary object; valid magic names such as `__proto__`,
    `constructor`, and `toString` survive JSON serialization without changing the
    payload prototype, including ordered multiple-file ID arrays;
  POST writeContext.submissionUrl with credentials:"same-origin" synchronously after the
    assertions, with no await/event
    boundary between the assertion, payload construction, and fetch initiation;
  on non-2xx read only response.error.code through toSafeSubmissionError;
  on any upload/submission failure keep form body and selections visible; when
    ui.bindingInvalid is true and the form error is owned by `"file-binding"`, preserve
    the exact FILE_BINDING_ERROR and its owner instead of running the generic renderer;
    otherwise render only toSafeSubmissionError(error).message in the form-level error node;
  finally clear ui.submissionController only when it is attemptController, set
    ui.submitting = false only for that owned attempt, and syncFormActionState(form),
    which cannot clear binding-invalid or still-pending disable reasons;
~~~

Within one initialization or input/change/Next/Back/Submit event, no helper recomputes
or substitutes the registry. The exact same object is passed through conditional
collection, progress persistence, step validation, upload preparation, `toPayload`,
`getFormFields`, and `readNamedValue`. Hidden-input serialization trusts identity and
single/multiple shape only from `bindingByHidden.get(input)`, never an ambient variable,
marker string, DOM position, or the hidden value itself.

Do not silently continue after an upload error. Selection change during an in-flight
request must invalidate its result via generation identity; AbortController must cancel
transport promptly on selection/signature/hide/reset changes, but generation is still the
correctness guard. Sequential uploads are preferred for
predictable order and bounded resource use.

## Security Contract

The static runtime uses only the existing POST /forms/:id/uploads and /submissions URLs
for public forms. Public-mode writes always send the form-bound nonce, even when the
browser has a session cookie, and request a fresh configured captcha token per write.
It never fetches `/admin/api/auth/csrf`, accepts an API key, or attempts the internal
session/API-key path: the existing renderer does not emit an interactive form for
`submissionAccess:"internal"`. TASK-536-04 preserves and tests internal session
forms:write plus CSRF and API-key forms.submit for direct internal API callers. The server owns
strict validation, the one selected rate bucket, field/media ownership, and byte checks;
hidden IDs and client state are untrusted.

Capture one immutable write context before the first upload. Each upload uses its
same-origin `/forms/${encodeURIComponent(formId)}/uploads`, explicit
`credentials:"same-origin"`, and a fresh `FormData`: append `fieldName`, `file`, and the
non-empty public `formNonce` in that order, then append `captchaToken` only when configured
and non-empty. Send only `Accept: application/json`; the browser owns the multipart
`Content-Type` boundary. A missing form id/nonce fails locally with bounded copy and no
request. The constructed URLs must retain the exact expected pathname with empty
search/hash after URL parsing; dot-segment form IDs such as `.` and `..` fail locally
instead of being normalized into another route. The upload response contributes only a
validated UUID `id`; URL, MIME, size,
filename, server message, provider detail, and unknown JSON keys never enter submission
state or visible copy. The final JSON request uses the context's separately built
same-origin `/forms/${encodeURIComponent(formId)}/submissions` with
`credentials:"same-origin"`; it never fetches a mutable `form.action`. After the final
captcha and immediately before serialization, require the live form id, nonce, action,
captcha site key/action, and normalized form action still match the captured context.
The context also captures the exact trusted nonce/CAPTCHA input references returned by
`readFormSecurityControls`; live validation requires the same marker bytes, input
type/name, form owner, cardinality, and references. Names alone never identify a security
control, so legacy/API-authored ordinary fields called `__nl_form_nonce` or `captchaToken`
remain serializable without weakening nonce/CAPTCHA ownership.

## Progress and conditional behavior

persistProgress/hydrateProgress must exclude the native FileList and file companion ID
values. Conditional hide clears state and invalidates in-flight results. Moving between
steps retains the live FileList within the current DOM but cannot mark it uploaded unless
the endpoint succeeds. A failed retry reuses the current selection and requests fresh
anti-abuse tokens. The L01 status node owns `empty:sr-only`: runtime helpers reveal it by
setting non-empty bounded text and collapse it by clearing text, without adding a second
hidden/class toggle that could conflict with the selector.

## Error contract

Map only bounded machine codes through the fixed `SAFE_UPLOAD_COPY` constants to the
field alert; never render a server message, response text, raw exception, or arbitrary HTML.
Network, malformed JSON, non-2xx, missing ID, or generation change cannot populate the
hidden input. Form-level captcha, network, and non-2xx failures likewise render only the
fixed `SAFE_SUBMISSION_COPY` selected from an allowlisted machine code; server
`error.message`, arbitrary thrown `Error.message`, provider detail, response text, and HTML
are never shown. No raw filename/path, File, provider URL, or partial ID array enters final
JSON.

## Regression-test shape

This leaf updates `tests/vitest/widgets/formRuntimeScript.test.ts` before its source gate.
The suite must execute the source against a DOM and mocked fetch to cover required
single, ordered multiple, upload failure and
retry, selection change during flight, conditionally hidden file field, separate captcha
token per request, no progress restoration, malformed response, and submit failure after
successful upload. Add malformed-binding cases for mismatched, empty, and duplicate
`data-form-file-input`/`data-form-file-value`/`data-form-file-status` identities and
prove they produce an explicit blocking form-invalid state without uploading or
serializing any marker-bearing companion. Include the form root plus HTML, SVG, and MathML
elements carrying only a standalone `data-form-file-multiple` marker and prove discovery
classifies every one as invalid instead of silently omitting non-HTMLElement/root nodes.
Add wrong-tag and wrong-input-type fixtures for every role and
prove only a native file input, distinct native hidden companion, and distinct non-input
HTMLElement status under the same strict field-owner ancestor can form a binding. Remove
the original status marker/node, promote the existing form root as the sole fully marked
role=status/aria-live=polite candidate, then prove the form retains its raw/hidden/submit
child structure and no direct form-root `textContent` write occurs (the bounded descendant
form-error node may still update). Separately move only hidden and only status into another
field container, leaving raw and the other role in the original owner. Also mark status as
`data-form-field` and nest raw+hidden beneath it so coordinated closest-owner equality
cannot make the writable status its own wrapper. Every case must block before a request or
status-target write. Separately nest the submit button or nonce input under an otherwise
valid marked status and prove childElementCount validation preserves those controls and
blocks before a status write/request. Assert malformed event dispatch returns through
the blocking branch without an uncaught exception or `console.error`. While upload is
deferred, assert bounded progress text, role=status/aria-live=polite, form/button busy
semantics, and disabled Submit/Back/Next; on upload error assert role=alert/
aria-live=assertive and eventual action-state recovery. Assert exact request order/body.
Put a malformed file triple on an
earlier multi-step page and prove Next cannot advance before the final submit; repair the
triple, dispatch real input/change, Next, Back, and submit events, and prove through
conditional visibility, persisted ordinary values, navigation, request count/body, hidden
ID, and status output that each event uses one coherent repaired binding. Source review
must verify one registry recomputation per event and that the same local registry variable
is passed through conditional collection, progress, validation, upload preparation,
`toPayload`, and `readNamedValue`; tests must not access or export private WeakMaps. In one
form combine a single-file and a multiple-file binding and prove their hidden encodings
and final payload are respectively a UUID string and an ordered UUID array: the mapped
binding—not an ambient flag—controls decoding. Pin the multiple-file boundary shared with
L02 in a fresh form where an earlier single-file binding has one selected file and a later
multiple binding has 21: the synchronous whole-form preflight must fail locally with the
fixed `file_selection_invalid` field alert, leave every binding's hidden ID neutral, and
perform zero captcha, upload, or submission request. Then select exactly 20 in the later
binding and prove the same form remains retryable and completes ordered preparation plus
submission. Assert raw/hidden
multiple-marker `"0"|"1"` parity with native `input.multiple`; missing/malformed/mismatch
blocks. The structural matrix must cover empty/mismatch/duplicate independently for all
three role markers, missing/malformed markers on raw and hidden, cross-role marker
stacking on one element, and exact status exclusions. Through observable fetch, DOM,
busy, and result assertions—not a production
export of private WeakMaps—start one pending upload, trigger an exact-signature registry
recompute through an unrelated real input event, let the first submission stop as stale,
then retry and prove the preserved completed state/IDs cause no second upload request.
Prove same field identity in another form remains isolated. Change each signature seam
(form, identity, hidden, status, multiple) while keeping the native input, then prove the
old request signal aborts or its late result is ignored, the rotated binding has neutral
hidden/status output, and the old public attempt settles before retry. Source review must
verify captured-promise identity guards; the observable retry must then keep
`data-file-upload-pending="1"`, busy semantics, and disabled actions until its own request
settles, while resolving an abandoned raw transport afterward cannot clear or overwrite
the newer UI/ID. Do not claim the old private `finally` overlaps a newer public attempt,
because duplicate-submit ownership deliberately serializes that seam. Observe writes from
the terminal-settlement boundary: success writes the owned hidden ID and completion status
once; failure leaves/returns the hidden value neutral and writes the bounded error status
once; late work performs zero further hidden/status writes. Prove the late zero-write case
with a distinct genuinely abandoned raw fetch/captcha promise that resolves only after a
newer attempt owns/settles the UI; calling the resolver of an already-settled Promise a
second time is a no-op and is not evidence. The earlier progress-status
transition is expected and is not counted as a terminal write.
Make a previously valid binding malformed or remove all of its markers during an upload;
prove comparison with the previous registry invalidates/deletes its owner, clears the old
DOM, rejects the old operation as stale, and cannot resurrect IDs after a later repair.
Repair the exact registry, perform a fresh successful submit, and inspect the valid final
payload to prove tombstoned/native raw controls remain excluded while the current validated
hidden companion contributes only its fresh owned media ID. Retain the old stripped,
renamed, marker-free hidden companion alongside a new/repaired exact triple so absence of
that old named control from the valid payload proves tombstone exclusion rather than only
native-file exclusion or invalid-form blocking.
Change an optional selection during its in-flight upload and prove the bounded stale
rejection prevents the original final submission request until the new selection uploads.
Defer an upload captcha, then change/hide/reset the selection; the abort-aware race must
settle promptly, restore `data-file-upload-pending="0"` when no other upload owns it, issue no upload after
the late token resolves, and retain any independent invalid-binding disable reason.
Silently replace both a completed and an actively uploading FileList with different
same-count File objects
without an event and prove object-identity checks prevent cached IDs/reuse and upload the
new selection. A conditional hide must set native input.value=""; hide→show cannot upload
or restore the old file until the user makes a fresh selection.
Then make the upload succeed and the submission fail, retry submission with the same
selection, and prove the complete fast path reuses the canonical hidden IDs, performs no
second upload fetch, does not overwrite later hidden/status output, leaves no stale visible error, and
allows the final submission to succeed with a fresh submission captcha token.
Defer that final captcha promise, change an optional FileList while it is pending, then
prove the form-scoped abort race settles promptly, releases submitting UI, and rejects
before `toPayload`/fetch; resolving the late captcha afterward causes no write. Repeat
with reset/registry invalidation. The next submit must upload the new File object selection
and obtain another fresh captcha token.
During deferred final captcha, separately replace the hidden ID with another valid UUID,
mutate marker/type/name/multiple/visibility bytes, add an extra marker element, strip
all markers while assigning the raw file input a name, re-enable both raw/hidden controls
inside a still-hidden conditional container, and separately mutate raw `required`,
`data-required-original`, raw `aria-required`, hidden `required`/required metadata, and
only one of raw/hidden `disabled`. Add an independent visible-field mutation that sets
both raw and hidden `disabled=true` during deferred final captcha; because no cleanup
event runs, final live validation must reject the pair even though the flags are equal,
proving the invariant is `disabled === !visible`, not mere raw/hidden equality. Without changing marker refs, run independent hidden-only
and status-only moves into another `[data-form-field]` in the same form, leaving the other
roles in the original owner. In a third independent case, mark status as a field container
and nest raw+hidden beneath it; strict-ancestor/status-containment checks must reject.
In a fourth case, move submit/nonce under the otherwise valid status so the live
element-child-free invariant rejects without deleting either control.
Separately flip only container.hidden and only
data-logic-visible so their representations disagree. Every case must fail before JSON
serialization/submission; tombstoned controls and every native file input remain excluded.
Separately use two selected bindings with the later field optional, defer the earlier
upload, and silently disable the later raw+hidden pair while its visible owner remains visible. When the earlier request
settles, the later binding must clear locally with no captcha/upload and no retained ID;
its local clear intentionally aborts the active attempt with bounded
file_selection_changed and blocks submission until a real repaired recomputation. Do not
claim this sequential cleanup itself reaches final live validation; the separate deferred
final-captcha pair above owns that assertion.
In another two-binding case, after whole-form preflight but while the earlier upload is
deferred, silently replace the later FileList with 21 files and make its status target
unsafe. Its per-binding defensive cardinality failure must route through
`failUnsafeFileStatusTarget`: original form gets `bindingInvalid=1` plus the exact owned
FILE_BINDING_ERROR, later hidden stays neutral, and the later field performs zero request.
In the same deferred window separately mutate `form.action` to a cross-origin URL,
`data-form-id`, nonce, captcha site key, and captcha action; the immutable write-context
check must issue zero final/external fetch. Repeat form-id, nonce, site-key, and action
mutations using only added leading/trailing whitespace and prove byte-exact comparison
still rejects (only a literally empty captcha action normalizes to public_write). Assert
every upload in a multi-binding attempt
and the final JSON use the one captured encoded form id/nonce, exact same-origin URLs,
`credentials:"same-origin"`, and local final captcha token. Missing/mismatched initial
write context must fail locally with bounded UI, zero uncaught error, and zero request.
Require exactly one nonce input: a duplicate nonce must fail locally with zero
captcha/upload/submission instead of selecting either value. Configure bot protection and
assert `grecaptcha.execute` is called zero times rather than inferring that from zero fetch.
Before submit, separately pad form ID, nonce, captcha site key, and captcha action with
leading/trailing whitespace and prove capture rejects locally with zero write; do not rely
only on the deferred live-mutation matrix.
Use `.` and `..` as separate form IDs and prove URL dot-segment normalization is rejected
with zero upload/submission fetch; pin the exact expected pathname plus empty search/hash
for a valid encoded form ID.
Also stack a second file-role marker on each already-known raw/hidden/status element during
deferred final captcha and prove exclusive live-role validation rejects without relying on
marker-set size. During deferred final captcha separately add a marker to the form root and
add standalone SVG/MathML marker elements, proving live validation uses the same all-Element
root-inclusive collector. Trigger a real registry-invalidating event during final captcha and prove
the captured final-attempt request signal aborts promptly, busy UI settles, and a late
token cannot initiate a write. With captcha enabled, make upload succeed,
final submission fail, then retry and prove completed IDs are reused without another
upload while a fresh final captcha token is still required.
Independently defer an upload that will succeed and one that will fail. After progress is
visible but before each transport settles, move only submit (success case) and only nonce
(failure case) under the otherwise valid status. Resolve transport and prove the guarded
terminal write preserves the nested control/remaining form child structure, performs no
completion/error status write, keeps hidden IDs neutral, starts no final submission, and
shows only bounded fail-closed form UI with data-file-binding-invalid="1" and
Submit/Back/Next disabled after settlement. Assert the exact FILE_BINDING_ERROR copy and
`"file-binding"` error ownership survive the generic catch. Repair the status DOM, dispatch
a real registry-recomputing event, and prove bindingInvalid plus its owned form error clear,
actions re-enable, and a fresh retry can proceed. Repeat the preservation assertion for reset/stale cleanup so no
unguarded status mutation remains.
Run an explicit no-event `2 mutation shapes × 2 transport outcomes` table before terminal
settlement: (a) move the entire field owner and all three roles into a second form, or
(b) keep the owner in place but retarget raw+hidden `form` association to that second
form; independently resolve upload success and upload failure for each shape. The
immutable captured-form guard must prevent every status write and every non-empty hidden
ID commit in the second/retargeted form, allow only a neutralizing hidden clear, set the
original form's owned binding error, and start no submission. Repair by moving the owner
back for shape (a) or restoring/removing the `form` attributes for shape (b), dispatch a
real recomputing event, assert the owned alert is actually hidden (not merely stripped of
its owner attribute), and prove retry succeeds.
Separately prime one binding into the cached-complete fast path, then begin a new submit
with an earlier binding's upload deferred. During that await, silently move or retarget
the cached binding using both cross-form mutation shapes. When preparation reaches the
cached binding, structural visibility must reject captured-form drift before the fast
path can reuse IDs, neutralize its foreign/retargeted hidden companion, and prevent final
submission; this case must not rely only on the later final live-registry check.
Dispatch a duplicate submit during deferred upload and deferred final captcha; it returns
before recomputation, does not invalidate the active registry, and creates no extra write.
Source review must verify `failUnsafeFileStatusTarget` accepts no caller-selected error
argument and contains the literal branded `file_selection_changed` throw, and that the
generic submit catch preserves the fixed error only when both `bindingInvalid` and exact
`"file-binding"` ownership are present.
Assert exact multipart URL, credentials, Accept header, key order/values, optional captcha
omission, and absence of a manual Content-Type. Table-drive every allowlisted
`SAFE_UPLOAD_COPY` and `SAFE_SUBMISSION_COPY` code through the observable field/form node,
pin its exact constant copy, and prove an arbitrary server message/provider body/filename
is never rendered. Independently reject the upload fetch and return syntactically
malformed upload JSON; both must use bounded default upload copy, leave the hidden ID
neutral, settle pending/busy state, and remain retryable. With captcha enabled, make the first upload fail, retry the same File
selection, and prove the retry obtains a fresh upload captcha token before a separately
fresh final-submission token.
For final captcha rejection, network rejection, and non-2xx JSON carrying an allowlisted
code plus a malicious `error.message`, assert only fixed `SAFE_SUBMISSION_COPY` reaches the
form error node; raw thrown/server/provider text never appears. For invalid single
cardinality and missing local form id/nonce, assert a field-level bounded alert, neutral
hidden IDs, non-busy/pending DOM state after settlement, and zero fetch. After a prior
error, an optional empty selection must clear its visible status, restore
role=status/aria-live=polite, restore enabled/non-busy actions when no other owner remains,
and issue zero fetch.
A neutral multiple companion `""` must collect as `[]` without an error; canonical nonempty
JSON decodes, while malformed/noncanonical JSON blocks with zero uncaught exception and
zero `console.error`.
Serialize valid dynamic names through enumerable own data properties, not prototype-aware
bracket assignment. Cover ordinary names plus `__proto__`, `constructor`, and `toString`,
including an ordered multiple-file ID array; assert `Object.hasOwn`, exact JSON, and the
unchanged ordinary payload prototype. Exercise the same three names through conditional
logic and save/hydrate progress: values are own data, missing values never resolve inherited
built-ins, and hydration requires `Object.hasOwn`. Render the real Form Embed, Contact, and
Newsletter public Forms bindings with every collision name each renderer can represent:
Form Embed and Contact cover both `__nl_form_nonce` and `captchaToken`, while Newsletter's
existing leading-letter field-name grammar makes only `captchaToken` reachable. Place the
ordinary fields alongside the marked security controls; execute their injected shared
runtime and prove both ordinary values reach `data`, while the exact marked nonce and
CAPTCHA control remain security-owned. Also prove legacy non-file success plus a failed
request followed by action recovery/retry. Duplicate/malformed/moved/cross-role security
markers fail locally before any write. These are compatibility cases for existing
block/section consumers, not new authoring surfaces.
Mutate a valid triple to malformed during upload and prove the centralized action state
stays disabled after the stale operation settles until the binding is truly repaired.
A hide→show conditional cycle must restore `required` only on the native input,
never on the hidden companion. Dispatch reset and exercise the real
`show-message-reset-form` success path to prove captured request signals abort, late IDs
cannot appear, hidden/status output clears, pending/busy DOM settles, and status semantics
return to role=status/aria-live=polite. TASK-536-05-L01 owns only additive
cross-contract cases and final read-only reruns of these assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/eslint --max-warnings=0 \
  core/widgets/core/formRuntimeScript.ts core/widgets/core/formEmbed.tsx
bunx vitest run --config vitest.config.ts \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/contact.test.tsx \
  tests/vitest/widgets/newsletter.test.tsx
~~~

Re-run the named failing file alone before classification.

## Acceptance criteria

- Submission fetch never starts until every visible file upload succeeds.
- Required/multiple payloads match server validation exactly, including the maximum of
  20 selected files per field before any upload transport.
- Pending, stale, partial, and failed work cannot leak media IDs into submission.
- Cached IDs are bound to exact ordered File object identities; silent same-count
  replacements, live marker/value mutations, and duplicate submits fail closed.
- One immutable same-origin write context binds all uploads and the final submission;
  mutable action/form-id/nonce/captcha DOM cannot redirect or retarget a write, including
  whitespace-only byte drift.
- Upload and final-submission captcha waits are abort-aware; stale late tokens cannot
  retain busy UI or initiate a write.
- Changing any binding-signature seam rotates state; a changed optional selection also
  blocks the old submission until its current generation uploads successfully.
- Empty, mismatched, or duplicate file markers block the form and cannot enter generic
  hidden-input serialization; marker discovery includes the form root and non-HTML Elements.
- Raw, hidden, and status roles retain one exact, distinct strict-ancestor field owner;
  the form root, a role promoted to wrapper, or another container can never become the
  status write target, and status remains element-child-free before text writes.
- Every status mutation is guarded immediately at the write boundary, including terminal
  async success/failure and stale/reset cleanup; unsafe descendants are preserved.
- Neutral multiple `""` decodes as `[]`; malformed non-empty JSON and tombstoned/native
  file controls cannot reach generic serialization or browser-console exceptions.
- One derived UI state preserves disabled actions across submitting, invalid-binding,
  and pending-upload ownership; upload requests use the exact same-origin multipart shape.
- Registry recomputation preserves per-native-input upload state, while malformed DOM
  roles block without throwing uncaught browser-event errors.
- Live conditional visibility requires raw/hidden disabled coherence and exact raw
  required/aria-required parity before serialization.
- Reset and reset-form success invalidate uploads, clear hidden/status state, and never
  restore required on the hidden companion.
- The user can retry without reloading and receives an observable field-level result.
