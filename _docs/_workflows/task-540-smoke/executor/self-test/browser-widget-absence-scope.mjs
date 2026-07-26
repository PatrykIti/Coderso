// Shape guard over the REAL emitted browser sources: a generated source must never gate on the
// page-wide ABSENCE of a shared widget class. Sibling of assertSelectorTextEngineShape() in
// contract/selectors.mjs -- that one guards the registry's selector literals, this one guards the
// JavaScript the browser layer compiles around them.
//
// A "shared widget class" is a DOM role that a SHARED primitive stamps on every instance it ever
// renders, so the class alone says nothing about which scenario a node belongs to. shadcn's Alert
// sets role="alert" unconditionally (core/admin/components/ui/alert.tsx), Radix Dialog/AlertDialog
// set role="dialog"/"alertdialog", and Radix SelectItem sets role="option".
//
// PRESENCE checks on such a class are scope-robust: an unrelated extra instance can only help the
// check pass, and every one of them in this tree is paired with an identity assertion anyway. An
// ABSENCE check is the opposite. Any instance the route mounts for its OWN reasons -- a notice, a
// toast, a permission banner -- holds the page-wide count above zero forever, so the clause becomes
// unsatisfiable while still reading like a settlement condition. It then fails 30s later with a
// timeout that names the scenario rather than the element that actually defeated it, and only a
// full live smoke run can surface it.
//
// rc-011-visible-retry lost a whole live run to exactly that: its settlement poll waited for a
// page-wide [role="alert"] count of 0 on a route whose CustomScreenEntryEditorLayout permanently
// mounts a second, unrelated "Workspace upgrade required" Alert. Measured against the frozen retry
// fixture with the real Playwright engine, the page-wide count went 2 -> 1 across a fully
// successful retry while the scoped count went 1 -> 0.
//
// The rule therefore is: an absence test whose locator resolves to a selector literal carrying a
// shared widget class must narrow that class to a container -- either a [data-...] attribute
// earlier in the selector (a container the fixture owns) or a :has(...) narrowing on the widget
// itself that names one. Presence and cardinality tests are untouched.
//
// Resolution is deliberately textual and covers exactly the shapes this tree emits, verified
// against all 392 compiled run-code sources: an inline `.locator("...").count()`, an identifier
// bound by `const name = <recv>.locator("...")`, and a count read into a variable that is later
// compared against zero. A zero comparison that only picks a diagnostic string inside a `throw`
// is not a gate -- the source is already failing there -- and is excluded; bi-007/bi-009/bi-049/
// bi-054 rely on that exclusion for `throw new Error(count === 0 ? ... : ...)`.
import { deepFreezeExact, invariant } from "../foundation.mjs";

export const SHARED_WIDGET_CLASS_TOKENS = deepFreezeExact([
  '[role="alert"]',
  '[role="alertdialog"]',
  '[role="dialog"]',
  '[role="option"]',
]);

const CONTAINER_SCOPE_TOKEN = "[data-";
const NARROWING_PSEUDO = ":has(";
const LOCATOR_CALL = ".locator(";
const COUNT_CALL = ".count()";
const ABSENCE_COMPARISON = /^(?:===?\s*0|<\s*1)(?![\w.])/u;
const LOCATOR_BINDING =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.locator\(/gu;
const COUNT_BINDING =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+([A-Za-z_$][\w$]*)\.count\(\)/gu;
const COUNT_RECEIVER = /(^|[^.\w$])([A-Za-z_$][\w$]*)\.count\(\)/gu;

function widgetClassOccurrenceIsScoped(selector, token, index) {
  // A container attribute anywhere to the LEFT of the widget class is a descendant scope:
  // `[data-screen-block-id="..."] [role="alert"]` can only match inside that block.
  if (selector.slice(0, index).includes(CONTAINER_SCOPE_TOKEN)) return true;
  const rest = selector.slice(index + token.length);
  if (!rest.startsWith(NARROWING_PSEUDO)) return false;
  // Otherwise the widget class itself must be narrowed by a :has(...) that names a container
  // attribute, which is the shape the registered `relatedAlert`/`relatedRetry` selectors use.
  let depth = 0;
  for (let cursor = NARROWING_PSEUDO.length - 1; cursor < rest.length; cursor += 1) {
    if (rest[cursor] === "(") depth += 1;
    else if (rest[cursor] === ")") {
      depth -= 1;
      if (depth === 0)
        return rest.slice(NARROWING_PSEUDO.length, cursor).includes(CONTAINER_SCOPE_TOKEN);
    }
  }
  return false;
}

export function selectorScopesSharedWidgetClasses(selector) {
  invariant(typeof selector === "string", "widget-scope selector must be a string");
  for (const token of SHARED_WIDGET_CLASS_TOKENS) {
    let index = selector.indexOf(token);
    while (index !== -1) {
      if (!widgetClassOccurrenceIsScoped(selector, token, index)) return false;
      index = selector.indexOf(token, index + 1);
    }
  }
  return true;
}

// Reads the JavaScript string literal that starts at `start`, decoding the escapes the emitters
// produce (JSON.stringify writes \" inside double quotes; hand-written literals use single
// quotes), so both spellings of the same selector normalize to the same CSS text.
function readStringLiteralAt(text, start) {
  const quote = text[start];
  if (quote !== '"' && quote !== "'") return null;
  let value = "";
  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    const character = text[cursor];
    if (character === "\\") {
      const escaped = text[cursor + 1];
      if (escaped === undefined) return null;
      value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped === "r" ? "\r" : escaped;
      cursor += 1;
      continue;
    }
    if (character === quote) return { value, end: cursor + 1 };
    if (character === "\n") return null;
    value += character;
  }
  return null;
}

function absenceComparisonFollows(source, index) {
  let cursor = index;
  // `(await locator.count()) === 0` closes parentheses before the comparison; the bound keeps the
  // scan local so a distant unrelated `=== 0` can never be attributed to this count.
  for (let closers = 0; closers <= 4; closers += 1) {
    while (source[cursor] === " " || source[cursor] === "\n" || source[cursor] === "\t") cursor += 1;
    if (ABSENCE_COMPARISON.test(source.slice(cursor, cursor + 8))) return true;
    if (source[cursor] !== ")") return false;
    cursor += 1;
  }
  return false;
}

function zeroTestOnlyPicksThrowDiagnostic(source, index) {
  const statementStart = Math.max(
    source.lastIndexOf(";", index),
    source.lastIndexOf("{", index),
    source.lastIndexOf("}", index)
  );
  return source.slice(statementStart + 1, index).includes("throw ");
}

function collectLocatorBindings(source) {
  const bindings = new Map();
  for (const match of source.matchAll(LOCATOR_BINDING)) {
    const literal = readStringLiteralAt(source, match.index + match[0].length);
    if (literal === null || source[literal.end] !== ")") continue;
    if (!bindings.has(match[1])) bindings.set(match[1], new Set());
    bindings.get(match[1]).add(literal.value);
  }
  return bindings;
}

export function findSharedWidgetAbsenceViolations(source) {
  invariant(typeof source === "string", "widget-scope source must be a string");
  const violations = [];
  const bindings = collectLocatorBindings(source);
  const record = (selector, form) => {
    if (!selectorScopesSharedWidgetClasses(selector)) violations.push({ form, selector });
  };
  for (
    let index = source.indexOf(LOCATOR_CALL);
    index !== -1;
    index = source.indexOf(LOCATOR_CALL, index + 1)
  ) {
    const literal = readStringLiteralAt(source, index + LOCATOR_CALL.length);
    if (literal === null || source[literal.end] !== ")") continue;
    const afterLocator = literal.end + 1;
    if (!source.startsWith(COUNT_CALL, afterLocator)) continue;
    if (absenceComparisonFollows(source, afterLocator + COUNT_CALL.length))
      record(literal.value, "inline locator");
  }
  for (const match of source.matchAll(COUNT_RECEIVER)) {
    const nameStart = match.index + match[1].length;
    if (!absenceComparisonFollows(source, nameStart + match[2].length + COUNT_CALL.length)) continue;
    for (const selector of bindings.get(match[2]) ?? []) record(selector, "bound " + match[2]);
  }
  for (const match of source.matchAll(COUNT_BINDING)) {
    const zeroTest = new RegExp("\\b" + match[1] + "\\s*(?:===?\\s*0|<\\s*1)(?![\\w.])", "gu");
    for (const test of source.matchAll(zeroTest)) {
      if (zeroTestOnlyPicksThrowDiagnostic(source, test.index)) continue;
      for (const selector of bindings.get(match[2]) ?? []) record(selector, "counted " + match[2]);
    }
  }
  return violations;
}

export function assertBrowserSourceWidgetAbsenceScope(label, source) {
  const violations = findSharedWidgetAbsenceViolations(source);
  invariant(
    violations.length === 0,
    label +
      " gates on the page-wide absence of a shared widget class (" +
      violations.map(({ form, selector }) => form + ": " + selector).join(", ") +
      "); scope it to a container the fixture owns"
  );
  return source;
}

// Negative cases are grown from the REAL rc-011 settlement source, so the mutants are the shapes an
// author would actually reintroduce rather than invented strings. The anchor invariant fails loudly
// if the emitted text ever stops containing the scoped clause, which would make the mutants vacuous.
export function runBrowserWidgetAbsenceScopeSelfTest({ assertNegative, retrySettlementSource }) {
  const scopedAlert =
    '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))';
  const anchor =
    "const alertAbsent = await page.locator(" + JSON.stringify(scopedAlert) + ").count() === 0;";
  invariant(
    typeof retrySettlementSource === "string" &&
      retrySettlementSource.split(anchor).length === 2 &&
      findSharedWidgetAbsenceViolations(retrySettlementSource).length === 0,
    "rc-011 scoped settlement anchor drift"
  );
  const mutate = (clause) => retrySettlementSource.replace(anchor, clause);
  const rejects = (clause) => findSharedWidgetAbsenceViolations(mutate(clause)).length === 1;
  const accepts = (clause) => findSharedWidgetAbsenceViolations(mutate(clause)).length === 0;
  for (const [clause, label] of [
    [
      "const alertAbsent = await page.locator('[role=\"alert\"]').count() === 0;",
      "page-wide alert absence, inline single-quoted locator",
    ],
    [
      "const alertAbsent = await page.locator(" +
        JSON.stringify('[role="alert"]') +
        ").count() === 0;",
      "page-wide alert absence, inline JSON-escaped locator",
    ],
    [
      "const alertAbsent = (await page.locator('[role=\"alert\"]').count()) === 0;",
      "page-wide alert absence behind parentheses",
    ],
    [
      "const alertAbsent = await page.locator('[role=\"alert\"]').count() < 1;",
      "page-wide alert absence spelled as count() < 1",
    ],
    [
      "const pageAlert = page.locator('[role=\"alert\"]'); const alertAbsent = await pageAlert.count() === 0;",
      "page-wide alert absence through a bound locator",
    ],
    [
      "const pageAlert = page.locator('[role=\"alert\"]'); const alertCount = await pageAlert.count(); const alertAbsent = alertCount === 0;",
      "page-wide alert absence through a counted variable",
    ],
    [
      "const alertAbsent = await page.locator('[role=\"dialog\"]').count() === 0;",
      "page-wide dialog absence",
    ],
    [
      "const alertAbsent = await page.locator('[role=\"alertdialog\"]').count() === 0;",
      "page-wide alertdialog absence",
    ],
    [
      "const alertAbsent = await page.locator('[role=\"option\"]:text-is(\"Muted\")').count() === 0;",
      "page-wide option absence",
    ],
    [
      "const alertAbsent = await page.locator('[role=\"alert\"]:has(button)').count() === 0;",
      "widget narrowing that names no container",
    ],
  ])
    assertNegative(rejects(clause), label);
  // Positive controls: the rule must leave scope-robust and container-scoped code alone, or it
  // would push authors to weaken the sources instead of scoping them.
  invariant(
    accepts("const alertAbsent = await page.locator('[role=\"alert\"]').count() > 0;") &&
      accepts("const alertAbsent = await page.locator('[role=\"alert\"]').count() !== 0;") &&
      accepts("const alertAbsent = await page.locator('[role=\"alert\"]').count() === 1;") &&
      accepts(
        "const alertAbsent = await page.locator('[data-screen-block-id=\"b\"] [role=\"alert\"]').count() === 0;"
      ) &&
      accepts(
        "const pageAlert = page.locator('[role=\"alert\"]'); const alertCount = await pageAlert.count(); if (alertCount !== 1) throw new Error(alertCount === 0 ? 'missing' : 'duplicate');"
      ) &&
      accepts(
        'const alertAbsent = await page.getByText("Saving...", { exact: true }).count() === 0;'
      ),
    "widget-absence scope guard rejects a scope-robust source"
  );
}
