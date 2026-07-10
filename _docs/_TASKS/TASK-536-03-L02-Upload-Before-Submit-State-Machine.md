# TASK-536-03-L02: Upload-Before-Submit State Machine

# FileName: TASK-536-03-L02-Upload-Before-Submit-State-Machine.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-03
**Priority:** Critical
**Category:** Public Forms Runtime / Reliability / Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-536-03-L01
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Add a deterministic per-field upload state machine to the static Forms runtime. It
uploads current FileList entries to /forms/:id/uploads before constructing the final
submission JSON, preserves order, retries safely, and never advances with stale IDs.

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
  ids: string[];
  error: string | null;
  promise: Promise<string[]> | null;
};

type FileBinding = Readonly<{
  identity: string;
  input: HTMLInputElement;
  hidden: HTMLInputElement;
  status: HTMLElement;
  multiple: boolean;
}>;

type FileBindingRegistry = Readonly<{
  valid: readonly FileBinding[];
  bindingByHidden: WeakMap<HTMLInputElement, FileBinding>;
  invalidIdentities: readonly string[];
}>;

const fileBindingRegistryByForm = new WeakMap<HTMLFormElement, FileBindingRegistry>();

function recomputeFileBindingRegistry(form): FileBindingRegistry {
  collect every element carrying data-form-file-input, data-form-file-value, or
    data-form-file-status, including empty marker values;
  group non-empty identities without pairing by DOM order;
  require exactly one input, one hidden value, and one status for each identity;
  require hidden.name === identity and reject empty/mismatched/duplicate markers;
  for each exact validated triple create one immutable binding whose identity and
    multiple flag are copied from that validated native input;
  build bindingByHidden from each exact hidden companion to that full binding;
  registry = valid bindings + bindingByHidden + bounded invalid identity labels;
  fileBindingRegistryByForm.set(form, registry);
  return registry; // never silently ignore a malformed marker-bearing element
}

function requireValidFileBindings(form): FileBindingRegistry {
  registry = recomputeFileBindingRegistry(form);
  if registry.invalidIdentities is non-empty:
    mark form invalid, disable submit/step navigation, announce bounded form alert;
    throw file_binding_invalid before navigation/upload/submission;
  clear only the binding-invalid alert/disabled state;
  return registry;
}

function invalidateFileSelection(form, binding, registry) {
  state.generation += 1;
  state.phase = input.files.length ? "selected" : "idle";
  state.ids = [];
  hidden.value = "";
  clear bounded status/error;
  persistProgress(form, registry) without File or hidden media-ID values;
}

async function uploadCurrentSelection(form, binding) {
  if field is hidden/disabled: clear and return [];
  if no files: throw required validity only when required, else return [];
  if same generation is complete: return ids;
  if same generation is uploading: return state.promise;

  generation = state.generation;
  state.phase = "uploading";
  disable submit/step navigation and announce progress;
  for file in Array.from(input.files) in order:
    captchaToken = siteKey ? await executeRecaptcha(siteKey, "public_write") : null;
    body = FormData(fieldName, file, formNonce, captchaToken);
    response = await fetch(upload endpoint, POST body);
    require response id is a non-empty UUID-like string;
    append id only while generation still matches;
  on success:
    hidden.value = multiple ? JSON.stringify(ids) : ids[0] or "";
    state.phase = "complete"; announce complete; return ids;
  on abort/change:
    discard results; do not write hidden state;
  on failure:
    hidden.value = ""; state.phase = "error"; announce retryable message; throw;
  finally:
    clear identity-matching promise; restore controls unless form submission owns busy;
}

async function prepareFilesBeforeSubmission(form, registry) {
  for visible registry.valid bindings: await uploadCurrentSelection(form, binding);
  require every required binding complete;
}

function readNamedValue(input, registry) {
  binding = registry.bindingByHidden.get(input);
  if input carries any data-form-file-* marker and binding is undefined:
    return SKIP_VALUE;
  if binding is defined:
    require input === binding.hidden and input.name === binding.identity;
    return binding.multiple
      ? parse strict string[] JSON from input.value
      : trimmed single string from input.value;
  preserve existing behavior for every other input;
}

function getFormFields(form, registry) {
  exclude every marker-bearing element not present in registry.bindingByHidden;
  preserve ordinary named-control filtering;
}

function collectValues(form, registry) {
  iterate getFormFields(form, registry);
  pass this same registry to every readNamedValue call;
  skip SKIP_VALUE rather than treating it as an ordinary hidden value;
}

function refreshConditionalFields(form, registry) {
  values = collectValues(form, registry);
  evaluate conditional visibility from values;
  clear hidden file selections through invalidateFileSelection(form, binding, registry);
}

function persistProgress(form, registry) {
  iterate getFormFields(form, registry);
  omit native File values and every input present in registry.bindingByHidden;
  pass registry to every other readNamedValue call;
  persist only the existing safe progress shape;
}

function validateCurrentStep(form, registry) {
  validate current controls using collectValues(form, registry);
}

function validateStepsThroughCurrent(form, registry) {
  validate each eligible step using collectValues(form, registry);
}

function toPayload(form, registry) {
  iterate getFormFields(form, registry);
  readNamedValue(field, registry);
  preserve nonce/captcha extraction outside submission data;
}

on runtime initialization:
  registry = recomputeFileBindingRegistry(form);
  apply its valid/invalid UI state;
  hydrate progress without File or hidden media-ID values;
  refreshConditionalFields(form, registry);

on every relevant input/change event:
  registry = requireValidFileBindings(form); // exactly once for this event
  if this is a validated native file input:
    invalidateFileSelection(form, its binding, registry);
  refreshConditionalFields(form, registry);
  persistProgress(form, registry);

on Next:
  registry = requireValidFileBindings(form); // exactly once for this event
  refreshConditionalFields(form, registry);
  validateCurrentStep(form, registry);
  persistProgress(form, registry);
  only then advance;

on Back:
  registry = requireValidFileBindings(form); // exactly once for this event
  refreshConditionalFields(form, registry);
  persistProgress(form, registry);
  only then move back;

on submit:
  registry = requireValidFileBindings(form) exactly once before validation or busy state;
  refreshConditionalFields(form, registry);
  validateStepsThroughCurrent(form, registry);
  set form busy;
  await prepareFilesBeforeSubmission(form, registry);
  obtain a fresh captcha token for the submission request;
  payload = toPayload(form, registry);
  POST existing JSON endpoint;
  on any upload/submission failure keep form body and selections visible;
~~~

Within one initialization or input/change/Next/Back/Submit event, no helper recomputes
or substitutes the registry. The exact same object is passed through conditional
collection, progress persistence, step validation, upload preparation, `toPayload`,
`getFormFields`, and `readNamedValue`. Hidden-input serialization trusts identity and
single/multiple shape only from `bindingByHidden.get(input)`, never an ambient variable,
marker string, DOM position, or the hidden value itself.

Do not silently continue after an upload error. Selection change during an in-flight
request must invalidate its result via generation identity; AbortController may cancel
transport but generation is the correctness guard. Sequential uploads are preferred for
predictable order and bounded resource use.

## Security Contract

The static runtime uses only the existing POST /forms/:id/uploads and /submissions URLs
for public forms. Public-mode writes always send the form-bound nonce, even when the
browser has a session cookie, and request a fresh configured captcha token per write.
It never fetches `/admin/api/auth/csrf`, accepts an API key, or attempts the internal
session/API-key path: the existing renderer does not emit an interactive form for
`submissionAccess:"internal"`. TASK-536-04 preserves and tests internal session
forms:write plus CSRF and API-key forms.submit for non-widget callers. The server owns
strict validation, the one selected rate bucket, field/media ownership, and byte checks;
hidden IDs and client state are untrusted.

## Progress and conditional behavior

persistProgress/hydrateProgress must exclude the native FileList and file companion ID
values. Conditional hide clears state and invalidates in-flight results. Moving between
steps retains the live FileList within the current DOM but cannot mark it uploaded unless
the endpoint succeeds. A failed retry reuses the current selection and requests fresh
anti-abuse tokens.

## Error contract

Map safe server error messages to a bounded field alert; do not render arbitrary HTML.
Network, malformed JSON, non-2xx, missing ID, or generation change cannot populate the
hidden input. The submission response remains the owner of form-level success/error.
No raw filename/path, File, provider URL, or partial ID array enters final JSON.

## Regression-test shape

This leaf updates `tests/vitest/widgets/formRuntimeScript.test.ts` before its source gate.
The suite must execute the source against a DOM and mocked fetch to cover required
single, ordered multiple, upload failure and
retry, selection change during flight, conditionally hidden file field, separate captcha
token per request, no progress restoration, malformed response, and submit failure after
successful upload. Add malformed-binding cases for mismatched, empty, and duplicate
`data-form-file-input`/`data-form-file-value`/`data-form-file-status` identities and
prove they produce an explicit blocking form-invalid state without uploading or
serializing any marker-bearing companion. Assert visible busy/error state, disabled
submit/step navigation, and exact request order/body. Put a malformed file triple on an
earlier multi-step page and prove Next cannot advance before the final submit; repair the
triple, recompute one registry, then prove the same registry instance reaches
input/change conditional collection and progress, Next/Back/current-and-through-current
validation, upload preparation, `toPayload`, and `readNamedValue`. Also prove the mapped
binding—not an ambient flag—controls single versus multiple decoding. TASK-536-05-L01 owns only additive
cross-contract cases and final read-only reruns of these assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/forms/fileField.test.ts
~~~

Re-run the named failing file alone before classification.

## Acceptance criteria

- Submission fetch never starts until every visible file upload succeeds.
- Required/multiple payloads match server validation exactly.
- Pending, stale, partial, and failed work cannot leak media IDs into submission.
- Empty, mismatched, or duplicate file markers block the form and cannot enter generic
  hidden-input serialization.
- The user can retry without reloading and receives an observable field-level result.
