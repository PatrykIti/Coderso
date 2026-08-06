// Shape guard over the REAL emitted browser sources: a generated source must never gate on the
// page-wide ABSENCE of a shared widget class. Sibling of assertSelectorTextEngineShape() in
// contract/selectors.mjs -- that one guards the registry's selector literals, this one guards the
// JavaScript the browser layer compiles around them.
//
// A "shared widget class" is a DOM role that a SHARED primitive stamps on every instance it ever
// renders, so the class alone says nothing about which scenario a node belongs to. shadcn's Alert
// sets role="alert" unconditionally (core/admin/components/ui/alert.tsx), Radix Dialog/AlertDialog
// set role="dialog"/"alertdialog", and Radix SelectItem sets role="option". An ABSENCE gate on such
// a class is unsatisfiable on any route that mounts an instance for its OWN reasons -- a notice, a
// toast, a permission banner. The clause still reads like a settlement condition, so it fails 30s
// later with a timeout naming the scenario rather than the element that defeated it, and only a
// full live smoke run can surface it. rc-011-visible-retry lost a whole live run to exactly that:
// measured against the frozen retry fixture with the real Playwright engine, the page-wide
// [role="alert"] count went 2 -> 1 across a fully successful retry (the route permanently mounts an
// unrelated "Workspace upgrade required" Alert) while the scoped count went 1 -> 0.
//
// THE RULE. An absence gate whose locator resolves to a selector carrying a shared widget class
// must narrow that class with an attribute selector [data-...] sitting on the matched element or on
// a compound joined to it by descendant/child combinators only.
//
// WHAT THE [data-...] TEST PROVES, EXACTLY. It proves an attribute narrowing exists in a
// containing position. It does NOT prove the attribute is owned by the fixture, and the guard does
// not try: data-slot is stamped by every shadcn primitive and data-state by every Radix one, so
// they are no narrower than the role itself. The registered relatedAlert selector depends on that
// leniency -- [role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))
// discriminates by TEXT, not by attribute. So a SHARED_PRIMITIVE_ATTRIBUTE_NAMES name counts only
// when its own compound also carries a text predicate, and any other data-* name counts alone.
// That is the honest boundary: [role="alert"][data-state="open"] is rejected,
// [data-screen-block-id="..."] [role="alert"] is accepted, and neither verdict depends on the
// guard knowing who owns the attribute. A sibling combinator is not containment and is rejected.
//
// WHAT COUNTS AS AN ABSENCE GATE. count() -- or querySelectorAll().length -- compared to zero as
// === 0, == 0, < 1, <= 0 or the yoda forms 0 === n, 0 == n, 0 >= n, 1 > n; a negated count
// (!(await n)); any of those tests on a variable the count was read into; waitFor({ state:
// "hidden" }) and waitFor({ state: "detached" }); isHidden(). Cardinality tests (=== 1, !== 1) are
// untouched: an unrelated extra instance makes them fail loudly rather than hang.
//
// PRESENCE FORMS ARE NOT UNCONDITIONALLY SAFE. > 0, !== 0 and >= 1 are scope-robust only when
// their truth is what the source wants; an unrelated extra instance can then only help. Used as a
// not-yet-settled condition they are absence gates wearing a positive sign, so they are also
// checked in exactly two positions: inside a loop condition (a wait-for-disappearance) and inside
// an `if (...)` whose consequent begins with throw or return (a rejection).
//
// CORRECTION TO THE COMMIT MESSAGE THAT INTRODUCED THIS MODULE. It justified the presence exemption
// with "the 108 sources that legitimately do `page.locator('[role="alert"]').count() > 0`" and with
// every such read being "paired with an identity assertion anyway". The number is right and the
// exemption is right, but that spelling appears in ZERO compiled sources and pairing is not the
// mechanism. What actually exists: 108 sources bind `const alert = page.locator('[role="alert"]')`
// -- genuinely page-wide, single-quoted, BOUND, never inline -- and read `await alert.count() > 0`
// as an observation that the contract asserts TRUE (entry-save-failure-ui-settled in
// observation-sources.mjs, entry-error-retains-both-drafts in visible-assertion-sources.mjs).
// Those reads are safe because their truth is what the scenario wants, which is the qualification
// above, not because anything is paired with them. The unscoped [role="option"] click targets stay
// green for a different reason again: they carry no absence gate at all, only `count() !== 1`
// cardinality and a click.
//
// HOW A SELECTOR IS RESOLVED. Textually, no parser, from the compiled source only:
//   - string literals in either quote style with escapes decoded, plus `+` concatenations and
//     template literals where every unresolved term collapses to one NUL placeholder, so a
//     container prefix survives while an interpolated tail cannot invent one;
//   - a member path into an embedded `const config = { ... }` JSON object literal. This is the
//     tree's dominant idiom and the reason this module was rewritten: 108 of the 392 compiled
//     sources embed that object, they make 546 `.locator(config.selectors.*)` calls, and 165 of
//     those read config.selectors.relatedAlert. A guard that understood only literals did not fire
//     when a page-wide class was reintroduced through the registry value;
//   - identifiers bound by `const name = <locator expression>`, including alias hops, with the
//     receiver chain folded in, so `root.locator('[role="alert"]')` inherits root's scope instead
//     of being judged page-wide, which is what the literal-only version did to correct code;
//   - .first()/.last()/.nth()/.filter()/.and() pass through unchanged;
//   - page.getByRole("alert") with NO second argument, which is provably page-wide;
//   - attribute selectors are canonicalized first, so [role=alert], [role='alert'] and
//     [ role = "alert" ] cannot hide a token behind CSS-legal spelling, and every comma
//     alternative is checked on its own, so a container in one cannot vouch for another.
//
// WHAT IT DOES NOT CATCH. Deliberate, measured, and load-bearing for the next author:
//   1. getByRole(role, options). All 20 emitted uses pass { name, exact }, an accessible-name
//      narrowing the guard cannot evaluate, and five sources (dg-012, dg-015, dg-024, dg-037,
//      rc-037a) legitimately gate on `await dialog.count() !== 0` with such a locator, which is
//      correct because the name pins the dialog to this scenario. Rather than reject them or
//      pretend a name option is equivalent to a [data-...] scope, any options argument leaves the
//      locator outside the model, so a page-wide getByRole("alert", { ... }) absence gate slips.
//   2. Any selector the resolver cannot evaluate: a function parameter (page.locator(selector)
//      inside the shared one()/visible() helpers), payload.selector in the data-bearing sources, a
//      member path into a non-JSON object, an unbound identifier. Those gates are SKIPPED, not
//      failed; failing them closed would reject the 42 payload.selector sources on sight.
//   3. A negated isVisible(). `!(await x.isVisible())` is this tree's spelling for "precondition
//      failed because the node is NOT visible" in 147 sources; dg-022 and rc-016 apply it to a
//      [role="option"] they require to be PRESENT. It is textually identical to an absence read, so
//      flagging it produced two false positives and the rule was dropped. isHidden() and
//      waitFor({ state: "hidden" }) carry no such ambiguity and are covered.
//   4. Absence asserted OUTSIDE the source. A source may report a page-wide presence observation
//      and let the contract assert it false; the comparison then lives in
//      contract/visible-assertion-predicates.mjs where this guard cannot see it. Today every
//      false-asserted errorVisible reads a scoped selector (rc-012 via config.selectors.
//      relatedAlert), so the hazard is latent, not live.
//   5. Roles that are shared but unlisted. SHARED_WIDGET_CLASS_TOKENS is a denylist of proven
//      text-independent shared primitives; [role="tab"]/[role="tabpanel"] are equally shared and
//      are NOT checked, because the emitted tab sources filter them by ownership first.
//   6. An expression split across a newline between the locator and the count.
//
// A zero comparison that only picks a diagnostic string inside a `throw` is not a gate -- the
// source is already failing there -- and is excluded; bi-007/bi-009/bi-049/bi-054 rely on that
// exclusion for `throw new Error(count === 0 ? ... : ...)`.
import { deepFreezeExact, invariant } from "../foundation.mjs";

export const SHARED_WIDGET_CLASS_TOKENS = deepFreezeExact([
  '[role="alert"]',
  '[role="alertdialog"]',
  '[role="dialog"]',
  '[role="option"]',
]);

export const SHARED_PRIMITIVE_ATTRIBUTE_NAMES = deepFreezeExact([
  "data-align",
  "data-disabled",
  "data-highlighted",
  "data-orientation",
  "data-placeholder",
  "data-scroll-locked",
  "data-side",
  "data-slot",
  "data-state",
]);

const TEXT_PREDICATE_TOKENS = deepFreezeExact([":text-is(", ":has-text(", ":text("]);
const ROOT_EXPRESSION_NAMES = deepFreezeExact(["document", "page"]);
const PASS_THROUGH_LOCATOR_METHODS = deepFreezeExact(["and", "filter", "first", "last", "nth"]);
const HIDDEN_WAIT_STATE_TOKENS = deepFreezeExact([
  'state: "detached"',
  'state: "hidden"',
  "state: 'detached'",
  "state: 'hidden'",
]);

const UNRESOLVED_SEGMENT = "\0";
const CONTAINER_ATTRIBUTE_PREFIX = "data-";
const COUNT_ANCHOR = ".count()";
const LENGTH_ANCHOR = ".length";
const IS_HIDDEN_ANCHOR = ".isHidden()";
const WAIT_FOR_ANCHOR = ".waitFor(";
const ABSENCE_COMPARISON = /^(?:===?\s*0|<\s*1|<=\s*0)(?![\w.])/u;
const PRESENCE_COMPARISON = /^(?:!==?\s*0|>\s*0|>=\s*1)(?![\w.])/u;
const YODA_ABSENCE_COMPARISON = /(?:0\s*===?|0\s*>=|1\s*>)\s*$/u;
const BINDING_HEAD = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/gu;
const OBJECT_BINDING_HEAD = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/gu;
const MEMBER_PATH = /^([A-Za-z_$][\w$]*)((?:\.[A-Za-z_$][\w$]*|\[\d+\])*)$/u;
const MEMBER_PATH_STEP = /\.([A-Za-z_$][\w$]*)|\[(\d+)\]/gu;
const ATTRIBUTE_SELECTOR =
  /\[\s*([A-Za-z_][-\w]*)\s*(?:([~^$*|]?=)\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\]\s]+)\s*([iIsS])?\s*)?\]/gu;

function isSpace(character) {
  return character === " " || character === "\n" || character === "\t" || character === "\r";
}

function isIdentifierCharacter(character) {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "A" && character <= "Z") ||
    (character >= "0" && character <= "9") ||
    character === "_" ||
    character === "$"
  );
}

function normalizeSelector(selector) {
  return selector.replace(ATTRIBUTE_SELECTOR, (_whole, name, operator, value, flag) => {
    if (operator === undefined) return "[" + name + "]";
    const quoted = value.startsWith('"') || value.startsWith("'");
    const text = quoted ? value.slice(1, -1) : value;
    return "[" + name + operator + '"' + text + '"' + (flag === undefined ? "" : " " + flag) + "]";
  });
}

function scanTopLevel(text, visit) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote !== null) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      continue;
    }
    if (depth === 0) visit(character, index);
  }
}

function splitTopLevelTerms(text, separator) {
  const terms = [];
  let start = 0;
  scanTopLevel(text, (character, index) => {
    if (character !== separator) return;
    terms.push(text.slice(start, index));
    start = index + 1;
  });
  terms.push(text.slice(start));
  return terms;
}

function splitSelectorCompounds(alternative) {
  const boundaries = [];
  scanTopLevel(alternative, (character, index) => {
    if (isSpace(character) || character === ">" || character === "+" || character === "~")
      boundaries.push(index);
  });
  const compounds = [];
  let start = 0;
  let combinator = "";
  const flush = (end, nextCombinator) => {
    const text = alternative.slice(start, end);
    if (text.length > 0) {
      compounds.push({ combinator, end, start, text });
      combinator = nextCombinator;
    } else if (nextCombinator !== "") combinator = nextCombinator;
  };
  let cursor = 0;
  while (cursor < boundaries.length) {
    const runStart = boundaries[cursor];
    let runEnd = runStart;
    let runCombinator = " ";
    while (cursor < boundaries.length && boundaries[cursor] === runEnd) {
      const character = alternative[runEnd];
      if (character === ">" || character === "+" || character === "~") runCombinator = character;
      runEnd += 1;
      cursor += 1;
    }
    flush(runStart, runCombinator);
    start = runEnd;
  }
  flush(alternative.length, "");
  return compounds;
}

function compoundNarrowsSharedClass(compound) {
  const hasTextPredicate = TEXT_PREDICATE_TOKENS.some((token) => compound.includes(token));
  let narrows = false;
  for (const match of compound.matchAll(ATTRIBUTE_SELECTOR)) {
    const name = match[1];
    if (!name.startsWith(CONTAINER_ATTRIBUTE_PREFIX)) continue;
    if (!SHARED_PRIMITIVE_ATTRIBUTE_NAMES.includes(name)) return true;
    if (hasTextPredicate) narrows = true;
  }
  return narrows;
}

function isContainmentCombinator(combinator) {
  return combinator === " " || combinator === ">";
}

function compoundChainNarrowsSharedClass(compounds, position) {
  if (compoundNarrowsSharedClass(compounds[position].text)) return true;
  for (let other = position - 1; other >= 0; other -= 1) {
    if (!isContainmentCombinator(compounds[other + 1].combinator)) break;
    if (compoundNarrowsSharedClass(compounds[other].text)) return true;
  }
  for (let other = position + 1; other < compounds.length; other += 1) {
    if (!isContainmentCombinator(compounds[other].combinator)) break;
    if (compoundNarrowsSharedClass(compounds[other].text)) return true;
  }
  return false;
}

function alternativeScopesToken(alternative, token) {
  const compounds = splitSelectorCompounds(alternative);
  let index = alternative.indexOf(token);
  while (index !== -1) {
    const position = compounds.findIndex(
      (compound) => index >= compound.start && index < compound.end
    );
    if (position === -1) return false;
    if (!compoundChainNarrowsSharedClass(compounds, position)) return false;
    index = alternative.indexOf(token, index + 1);
  }
  return true;
}

export function selectorScopesSharedWidgetClasses(selector) {
  invariant(typeof selector === "string", "widget-scope selector must be a string");
  const normalized = normalizeSelector(selector);
  for (const token of SHARED_WIDGET_CLASS_TOKENS) {
    if (!normalized.includes(token)) continue;
    for (const alternative of splitTopLevelTerms(normalized, ",")) {
      if (!alternative.includes(token)) continue;
      if (!alternativeScopesToken(alternative, token)) return false;
    }
  }
  return true;
}

function readStringLiteralAt(text, start) {
  const quote = text[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
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
    if (character === "\n" && quote !== "`") return null;
    if (quote === "`" && character === "$" && text[cursor + 1] === "{") {
      const close = findBalancedClose(text, cursor + 1);
      if (close === -1) return null;
      value += UNRESOLVED_SEGMENT;
      cursor = close;
      continue;
    }
    value += character;
  }
  return null;
}

function findBalancedClose(text, openIndex) {
  const closer = text[openIndex] === "(" ? ")" : text[openIndex] === "[" ? "]" : "}";
  let depth = 0;
  let quote = null;
  for (let cursor = openIndex; cursor < text.length; cursor += 1) {
    const character = text[cursor];
    if (quote !== null) {
      if (character === "\\") cursor += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === text[openIndex]) depth += 1;
    else if (character === closer) {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

function buildBracketPairs(source) {
  const pairs = new Map();
  const stacks = new Map([
    [")", []],
    ["]", []],
    ["}", []],
  ]);
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'" || character === "`") {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === character) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (character === "(") stacks.get(")").push(index);
    else if (character === "[") stacks.get("]").push(index);
    else if (character === "{") stacks.get("}").push(index);
    else if (stacks.has(character)) {
      const open = stacks.get(character).pop();
      if (open !== undefined) {
        pairs.set(open, index);
        pairs.set(index, open);
      }
    }
    index += 1;
  }
  return pairs;
}

function collectJsonObjectBindings(source, pairs) {
  const bindings = new Map();
  for (const match of source.matchAll(OBJECT_BINDING_HEAD)) {
    const openIndex = match.index + match[0].length - 1;
    const closeIndex = pairs.get(openIndex);
    if (closeIndex === undefined) continue;
    try {
      const value = JSON.parse(source.slice(openIndex, closeIndex + 1));
      if (value !== null && typeof value === "object") bindings.set(match[1], value);
    } catch {
      continue;
    }
  }
  return bindings;
}

function resolveMemberPath(objectBindings, text) {
  const match = MEMBER_PATH.exec(text);
  if (match === null) return null;
  let value = objectBindings.get(match[1]);
  if (value === undefined) return null;
  for (const step of match[2].matchAll(MEMBER_PATH_STEP)) {
    if (value === null || typeof value !== "object") return null;
    value = step[1] === undefined ? value[Number(step[2])] : value[step[1]];
  }
  return typeof value === "string" ? value : null;
}

function resolveSelectorArgumentText(text, objectBindings) {
  let selector = "";
  for (const term of splitTopLevelTerms(text, "+")) {
    const trimmed = term.trim();
    const literal = trimmed.length === 0 ? null : readStringLiteralAt(trimmed, 0);
    if (literal !== null && literal.end === trimmed.length) {
      selector += literal.value;
      continue;
    }
    const resolved = resolveMemberPath(objectBindings, trimmed);
    selector += resolved === null ? UNRESOLVED_SEGMENT : resolved;
  }
  return selector;
}

function createSourceResolver(source) {
  const pairs = buildBracketPairs(source);
  const objectBindings = collectJsonObjectBindings(source, pairs);
  const locatorBindings = new Map();
  const bindingEnds = new Map();
  let memo = new Map();

  const skipSpaceLeft = (index) => skipLeftSpace(source, index);
  const readIdentifierLeft = (index) => {
    let cursor = index;
    while (cursor > 0 && isIdentifierCharacter(source[cursor - 1])) cursor -= 1;
    return cursor === index ? null : { name: source.slice(cursor, index), start: cursor };
  };
  const combine = (receiverSelectors, selector) =>
    receiverSelectors === null
      ? null
      : receiverSelectors.map((prefix) => (prefix === "" ? selector : prefix + " " + selector));

  function computeExpressionEndingAt(end) {
    const stop = skipSpaceLeft(end);
    if (stop === 0) return { selectors: null, start: stop };
    const character = source[stop - 1];
    if (character === ")") {
      const open = pairs.get(stop - 1);
      if (open === undefined) return { selectors: null, start: stop };
      const callee = readIdentifierLeft(open);
      if (callee === null) return { selectors: null, start: stop };
      const hasReceiver = source[callee.start - 1] === ".";
      const receiver = hasReceiver
        ? resolveExpressionEndingAt(callee.start - 1)
        : { selectors: null, start: callee.start };
      const start = hasReceiver ? receiver.start : callee.start;
      const argumentText = source.slice(open + 1, stop - 1);
      if (hasReceiver && PASS_THROUGH_LOCATOR_METHODS.includes(callee.name))
        return { selectors: receiver.selectors, start };
      if (callee.name === "locator" || callee.name === "querySelectorAll") {
        const [first] = splitTopLevelTerms(argumentText, ",");
        const selector = resolveSelectorArgumentText(first, objectBindings);
        return { selectors: combine(receiver.selectors, selector), start };
      }
      if (callee.name === "getByRole") {
        const terms = splitTopLevelTerms(argumentText, ",");
        const trimmed = terms[0].trim();
        const literal = readStringLiteralAt(trimmed, 0);
        if (terms.length !== 1 || literal === null || literal.end !== trimmed.length)
          return { selectors: null, start };
        return { selectors: combine(receiver.selectors, '[role="' + literal.value + '"]'), start };
      }
      return { selectors: null, start };
    }
    if (isIdentifierCharacter(character)) {
      const identifier = readIdentifierLeft(stop);
      if (identifier === null) return { selectors: null, start: stop };
      if (source[identifier.start - 1] === ".") return { selectors: null, start: identifier.start };
      if (ROOT_EXPRESSION_NAMES.includes(identifier.name))
        return { selectors: [""], start: identifier.start };
      const bound = locatorBindings.get(identifier.name);
      return { selectors: bound === undefined ? null : bound, start: identifier.start };
    }
    return { selectors: null, start: stop };
  }

  function resolveExpressionEndingAt(end) {
    if (memo.has(end)) return memo.get(end);
    memo.set(end, { selectors: null, start: end });
    const value = computeExpressionEndingAt(end);
    memo.set(end, value);
    return value;
  }

  const statementEndFrom = (start) => {
    let index = start;
    while (index < source.length) {
      const character = source[index];
      if (character === '"' || character === "'" || character === "`") {
        const literal = readStringLiteralAt(source, index);
        index = literal === null ? index + 1 : literal.end;
        continue;
      }
      if (character === "(" || character === "[" || character === "{") {
        const close = pairs.get(index);
        if (close === undefined) return index;
        index = close + 1;
        continue;
      }
      if (
        character === ";" ||
        character === "\n" ||
        character === "," ||
        character === ")" ||
        character === "}"
      )
        return index;
      index += 1;
    }
    return source.length;
  };

  for (const match of source.matchAll(BINDING_HEAD)) {
    const rhsStart = match.index + match[0].length;
    const rhsEnd = statementEndFrom(rhsStart);
    bindingEnds.set(skipSpaceLeft(rhsEnd), match[1]);
    const resolved = resolveExpressionEndingAt(rhsEnd);
    if (resolved.selectors === null) continue;
    const existing = locatorBindings.get(match[1]) ?? [];
    locatorBindings.set(match[1], [...new Set([...existing, ...resolved.selectors])]);
  }
  memo = new Map();

  return { bindingEnds, pairs, resolveExpressionEndingAt, source };
}

function forEachOccurrence(source, token, visit) {
  for (
    let index = source.indexOf(token);
    index !== -1;
    index = source.indexOf(token, index + 1)
  )
    visit(index);
}

function selectorsCarrySharedWidgetClass(selectors) {
  const normalized = selectors.map((selector) => normalizeSelector(selector));
  return SHARED_WIDGET_CLASS_TOKENS.some((token) =>
    normalized.some((selector) => selector.includes(token))
  );
}

function skipLeftSpace(source, index) {
  let cursor = index;
  while (cursor > 0 && isSpace(source[cursor - 1])) cursor -= 1;
  return cursor;
}

function skipClosersRight(source, index) {
  let cursor = index;
  for (let closers = 0; closers <= 4; closers += 1) {
    while (isSpace(source[cursor])) cursor += 1;
    if (source[cursor] !== ")") return cursor;
    cursor += 1;
  }
  return cursor;
}

function comparisonFollows(source, index, pattern) {
  let cursor = index;
  for (let closers = 0; closers <= 4; closers += 1) {
    while (isSpace(source[cursor])) cursor += 1;
    if (pattern.test(source.slice(cursor, cursor + 10))) return true;
    if (source[cursor] !== ")") return false;
    cursor += 1;
  }
  return false;
}

function governingPrefix(source, start) {
  let cursor = skipLeftSpace(source, start);
  if (source.slice(Math.max(0, cursor - 5), cursor) === "await")
    cursor = skipLeftSpace(source, cursor - 5);
  for (let closers = 0; closers <= 4; closers += 1) {
    if (YODA_ABSENCE_COMPARISON.test(source.slice(Math.max(0, cursor - 10), cursor)))
      return "absence";
    if (source[cursor - 1] === "!" && source[cursor - 2] !== "!" && source[cursor - 2] !== "=")
      return "absence";
    if (source[cursor - 1] !== "(") return "none";
    cursor = skipLeftSpace(source, cursor - 1);
    if (source.slice(Math.max(0, cursor - 5), cursor) === "await")
      cursor = skipLeftSpace(source, cursor - 5);
  }
  return "none";
}

function hazardousPresencePosition(resolver, index) {
  const { pairs, source } = resolver;
  let cursor = index;
  for (let level = 0; level <= 4; level += 1) {
    let scan = cursor;
    let open = -1;
    while (scan > 0) {
      const character = source[scan - 1];
      if (character === ")" || character === "]" || character === "}") {
        const paired = pairs.get(scan - 1);
        if (paired === undefined) return false;
        scan = paired;
        continue;
      }
      if (character === "(") {
        open = scan - 1;
        break;
      }
      if (character === "{" || character === "[" || character === ";") return false;
      scan -= 1;
    }
    if (open === -1) return false;
    const keywordEnd = skipLeftSpace(source, open);
    let keywordStart = keywordEnd;
    while (keywordStart > 0 && isIdentifierCharacter(source[keywordStart - 1])) keywordStart -= 1;
    const keyword = source.slice(keywordStart, keywordEnd);
    if (keyword === "while" || keyword === "for") return true;
    if (keyword === "if") {
      const close = pairs.get(open);
      if (close === undefined) return false;
      let after = close + 1;
      while (isSpace(source[after])) after += 1;
      return source.startsWith("throw", after) || source.startsWith("return", after);
    }
    cursor = open;
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

function countedVariableIsGated(resolver, name) {
  const { source } = resolver;
  const absenceTests = new RegExp(
    "(?:^|[^\\w$.])" +
      name +
      "\\s*(?:===?\\s*0|<\\s*1|<=\\s*0)(?![\\w.])|(?:0\\s*===?|0\\s*>=|1\\s*>)\\s*" +
      name +
      "(?![\\w.$])|(?<![!=])!\\s*" +
      name +
      "(?![\\w.$])",
    "gu"
  );
  for (const match of source.matchAll(absenceTests))
    if (!zeroTestOnlyPicksThrowDiagnostic(source, match.index)) return true;
  const presenceTests = new RegExp(
    "(?:^|[^\\w$.])" + name + "\\s*(?:!==?\\s*0|>\\s*0|>=\\s*1)(?![\\w.])",
    "gu"
  );
  for (const match of source.matchAll(presenceTests))
    if (hazardousPresencePosition(resolver, match.index)) return true;
  return false;
}

function countGateForm(resolver, expressionStart, afterAnchor) {
  const { bindingEnds, source } = resolver;
  if (comparisonFollows(source, afterAnchor, ABSENCE_COMPARISON)) return "zero comparison";
  if (governingPrefix(source, expressionStart) === "absence") return "negated count";
  if (
    comparisonFollows(source, afterAnchor, PRESENCE_COMPARISON) &&
    hazardousPresencePosition(resolver, expressionStart)
  )
    return "presence gate in a rejection or wait";
  const boundName = bindingEnds.get(skipClosersRight(source, afterAnchor));
  if (boundName !== undefined && countedVariableIsGated(resolver, boundName))
    return "counted variable " + boundName;
  return null;
}

function waitForGateForm(resolver, anchorIndex) {
  const { pairs, source } = resolver;
  const open = anchorIndex + WAIT_FOR_ANCHOR.length - 1;
  const close = pairs.get(open);
  if (close === undefined) return null;
  const normalized = source.slice(open + 1, close).replace(/\s+/gu, " ");
  return HIDDEN_WAIT_STATE_TOKENS.some((token) => normalized.includes(token))
    ? "waitFor hidden or detached"
    : null;
}

export function findSharedWidgetAbsenceViolations(source) {
  invariant(typeof source === "string", "widget-scope source must be a string");
  const resolver = createSourceResolver(source);
  const recorded = new Map();
  const record = (form, selectors) => {
    for (const selector of selectors) {
      if (selectorScopesSharedWidgetClasses(selector)) continue;
      const key = form + " " + selector;
      if (!recorded.has(key)) recorded.set(key, { form, selector });
    }
  };
  const gateAt = (anchor, anchorIndex, describe) => {
    const resolved = resolver.resolveExpressionEndingAt(anchorIndex);
    if (resolved.selectors === null || !selectorsCarrySharedWidgetClass(resolved.selectors)) return;
    const form = describe(resolved.start, anchorIndex + anchor.length);
    if (form !== null) record(form, resolved.selectors);
  };
  const countGate = (expressionStart, afterAnchor) =>
    countGateForm(resolver, expressionStart, afterAnchor);
  forEachOccurrence(source, COUNT_ANCHOR, (index) => gateAt(COUNT_ANCHOR, index, countGate));
  forEachOccurrence(source, LENGTH_ANCHOR, (index) => {
    // Only a DOM query's length is a count; every other `.length` in these sources is an array's.
    const open = resolver.pairs.get(index - 1);
    if (source[index - 1] !== ")" || open === undefined) return;
    let calleeStart = open;
    while (calleeStart > 0 && isIdentifierCharacter(source[calleeStart - 1])) calleeStart -= 1;
    if (source.slice(calleeStart, open) !== "querySelectorAll") return;
    gateAt(LENGTH_ANCHOR, index, countGate);
  });
  forEachOccurrence(source, IS_HIDDEN_ANCHOR, (index) =>
    gateAt(IS_HIDDEN_ANCHOR, index, () => "isHidden")
  );
  forEachOccurrence(source, WAIT_FOR_ANCHOR, (index) =>
    gateAt(WAIT_FOR_ANCHOR, index, () => waitForGateForm(resolver, index))
  );
  return [...recorded.values()];
}

export function assertBrowserSourceWidgetAbsenceScope(label, source) {
  const violations = findSharedWidgetAbsenceViolations(source);
  invariant(
    violations.length === 0,
    label +
      " gates on the page-wide absence of a shared widget class (" +
      violations.map(({ form, selector }) => form + ": " + selector).join(", ") +
      "); narrow it with a [data-...] attribute on or containing the widget"
  );
  return source;
}

// Negative cases are grown from TWO REAL compiled sources, so the mutants are the shapes an author
// would actually reintroduce rather than invented strings: rc-011's settlement clause (a selector
// literal) and rc-012's registry read (config.selectors.relatedAlert, the idiom 108 sources use).
// The anchor invariants fail loudly if either emitted text stops containing its clause, which would
// make the mutants vacuous.
export function runBrowserWidgetAbsenceScopeSelfTest({
  assertNegative,
  configuredSelectorSource,
  retrySettlementSource,
}) {
  const scopedAlert =
    '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))';
  const escapedScopedAlert = JSON.stringify(scopedAlert).slice(1, -1);
  const retryAnchor =
    "const alertAbsent = await page.locator(" + JSON.stringify(scopedAlert) + ").count() === 0;";
  const configuredAnchor =
    "const errorVisible = await page.locator(config.selectors.relatedAlert).count() === 1 && " +
    "await page.locator(config.selectors.relatedAlert).isVisible();";
  invariant(
    typeof retrySettlementSource === "string" &&
      retrySettlementSource.split(retryAnchor).length === 2 &&
      findSharedWidgetAbsenceViolations(retrySettlementSource).length === 0,
    "rc-011 scoped settlement anchor drift"
  );
  invariant(
    typeof configuredSelectorSource === "string" &&
      configuredSelectorSource.split(configuredAnchor).length === 2 &&
      configuredSelectorSource.includes('"relatedAlert":"' + escapedScopedAlert + '"') &&
      findSharedWidgetAbsenceViolations(configuredSelectorSource).length === 0,
    "rc-012 configured selector anchor drift"
  );
  const mutate = (clause) => retrySettlementSource.replace(retryAnchor, clause);
  const rejects = (clause) => findSharedWidgetAbsenceViolations(mutate(clause)).length === 1;
  const accepts = (clause) => findSharedWidgetAbsenceViolations(mutate(clause)).length === 0;
  const zeroGate = (selectorSource) =>
    "const a = await page.locator(" + selectorSource + ").count() === 0;";
  // Re-spellings of the SELECTOR, each in the plainest absence gate: every one of these is a
  // page-wide gate wearing different CSS or JavaScript clothing.
  for (const [selectorSource, label] of [
    ["'[role=\"alert\"]'", "single-quoted literal"],
    [JSON.stringify('[role="alert"]'), "JSON-escaped literal"],
    ["'[role=\"dialog\"]'", "dialog token"],
    ["'[role=\"alertdialog\"]'", "alertdialog token"],
    ["'[role=\"option\"]:text-is(\"Muted\")'", "option token"],
    ["'[role=\"alert\"]:has(button)'", "narrowing that names no attribute"],
    ["'[role=alert]'", "unquoted attribute value"],
    ["\"[role='alert']\"", "single-quoted attribute value"],
    ["'[ role = \"alert\" ]'", "padded attribute selector"],
    ["`[role=\"alert\"]`", "template literal"],
    ["'[role=\"alert\"]' + suffix", "concatenated tail"],
    ["`[role=\"alert\"]:has(${inner})`", "template hole posing as a narrowing"],
    [
      "'[data-screen-block-id=\"b\"] [role=\"alert\"], [role=\"alert\"]'",
      "selector list with one scoped alternative",
    ],
    ["'[data-screen-block-id=\"b\"] + [role=\"alert\"]'", "sibling instead of containment"],
    ["'[role=\"alert\"][data-state=\"open\"]'", "shared-primitive attribute alone"],
    [
      "'[role=\"alert\"]:has([data-slot=\"alert-title\"])'",
      "shared-primitive attribute without a text predicate",
    ],
  ])
    assertNegative(rejects(zeroGate(selectorSource)), "page-wide widget absence, " + label);
  // Re-spellings of the GATE around a page-wide [role="alert"].
  const pageAlert = "'[role=\"alert\"]'";
  const bound = "const p = page.locator(" + pageAlert + "); ";
  const counted = "const n = await page.locator(" + pageAlert + ").count(); ";
  for (const [clause, label] of [
    ["const a = (await page.locator(" + pageAlert + ").count()) === 0;", "behind parentheses"],
    ["const a = await page.locator(" + pageAlert + ").count() < 1;", "count() < 1"],
    ["const a = await page.locator(" + pageAlert + ").count() <= 0;", "count() <= 0"],
    ["const a = await page.locator(" + pageAlert + ").count() == 0;", "count() == 0"],
    ["const a = 0 === await page.locator(" + pageAlert + ").count();", "yoda 0 === count()"],
    ["const a = 1 > await page.locator(" + pageAlert + ").count();", "yoda 1 > count()"],
    ["const a = !(await page.locator(" + pageAlert + ").count());", "negated count"],
    [bound + "const a = await p.count() === 0;", "bound locator"],
    [bound + "const n = await p.count(); const a = n === 0;", "bound locator, counted variable"],
    [bound + "const q = p; const a = await q.count() === 0;", "alias hop"],
    [counted + "const a = n === 0;", "inline locator, counted variable"],
    [counted + "const a = n <= 0;", "counted variable, n <= 0"],
    [counted + "const a = !n;", "counted variable, negated"],
    [counted + "const a = 0 === n;", "counted variable, yoda"],
    [
      "while (await page.locator(" + pageAlert + ").count() > 0) await page.waitForTimeout(25);",
      "presence form as a disappearance loop",
    ],
    [
      "if (await page.locator(" + pageAlert + ").count() !== 0) throw new Error('present');",
      "presence form as a throwing rejection",
    ],
    [
      "if (await page.locator(" +
        pageAlert +
        ").count() !== 0) return { failureClass: 'alert', settled: false };",
      "presence form as a returned failure frame",
    ],
    [
      "await page.locator(" + pageAlert + ').waitFor({ state: "hidden", timeout: 30000 });',
      "waitFor hidden",
    ],
    [
      "await page.locator(" + pageAlert + ').waitFor({ state: "detached", timeout: 30000 });',
      "waitFor detached",
    ],
    ["const a = await page.locator(" + pageAlert + ").isHidden();", "isHidden"],
    [
      "const a = await page.evaluate(() => document.querySelectorAll(" +
        pageAlert +
        ").length === 0);",
      "querySelectorAll length",
    ],
    ["const a = await page.getByRole('alert').count() === 0;", "bare getByRole"],
    ["const a = await page.locator(" + pageAlert + ").first().count() === 0;", "first() chain"],
    [
      "const a = await page.locator(" + pageAlert + ").filter({ hasText: 'x' }).count() === 0;",
      "filter() chain",
    ],
    [
      "const a = await page.locator('body').locator(" + pageAlert + ").count() === 0;",
      "chained locator on an unscoped receiver",
    ],
  ])
    assertNegative(rejects(clause), "page-wide widget absence, " + label);
  // The registry route: the selector never appears as a literal, only as a value inside the
  // embedded config object, which is exactly how the class reached 108 sources undetected.
  const pageWideRegistry = configuredSelectorSource
    .split(escapedScopedAlert)
    .join(JSON.stringify('[role="alert"]').slice(1, -1));
  const registryRead = "page.locator(config.selectors.relatedAlert)";
  for (const [clause, label] of [
    ["const errorVisible = await " + registryRead + ".count() === 0;", "zero comparison"],
    [
      "const alertNode = " + registryRead + "; const errorVisible = await alertNode.count() === 0;",
      "bound locator",
    ],
    [
      "const alertNode = " +
        registryRead +
        "; const alertCount = await alertNode.count(); const errorVisible = alertCount < 1;",
      "counted variable",
    ],
    [
      "while (await " +
        registryRead +
        ".count() > 0) await page.waitForTimeout(25); const errorVisible = false;",
      "disappearance loop",
    ],
  ])
    assertNegative(
      findSharedWidgetAbsenceViolations(pageWideRegistry.replace(configuredAnchor, clause))
        .length === 1,
      "page-wide widget absence through the registry value, " + label
    );
  // Positive controls: the rule must leave scope-robust and container-scoped code alone, or it
  // would push authors to weaken the sources instead of scoping them.
  invariant(
    accepts("const a = await page.locator(" + pageAlert + ").count() > 0;") &&
      accepts("const a = await page.locator(" + pageAlert + ").count() !== 0;") &&
      accepts("const a = await page.locator(" + pageAlert + ").count() === 1;") &&
      accepts(zeroGate("'[data-screen-block-id=\"b\"] [role=\"alert\"]'")) &&
      accepts(zeroGate("'[data-screen-block-id=\"b\"] > [role=\"alert\"]'")) &&
      accepts(zeroGate("'[role=\"alert\"] [data-screen-related-entry=\"x\"]'")) &&
      accepts(zeroGate("'[role=\"alert\"][data-screen-block-id=\"b\"]'")) &&
      accepts(zeroGate("'[data-screen-block-id=\"' + id + '\"] [role=\"alert\"]'")) &&
      accepts('const a = await page.getByText("Saving...", { exact: true }).count() === 0;') &&
      accepts(
        "const r = page.locator('[data-screen-block-id=\"b\"]'); const a = await r.locator(" +
          pageAlert +
          ").count() === 0;"
      ) &&
      accepts(
        bound +
          "const n = await p.count(); if (n !== 1) throw new Error(n === 0 ? 'missing' : 'duplicate');"
      ) &&
      accepts(
        "const d = page.getByRole('dialog', { name: 'x', exact: true }); if (await d.count() !== 0) return fail('dup');"
      ) &&
      findSharedWidgetAbsenceViolations(
        configuredSelectorSource.replace(
          configuredAnchor,
          "const errorVisible = await " + registryRead + ".count() === 0;"
        )
      ).length === 0,
    "widget-absence scope guard rejects a scope-robust source"
  );
  // The documented blind spots are pinned, so the header cannot silently become false in either
  // direction. Closing one of these is welcome -- move it into a negative table above and delete
  // its clause from the header's "WHAT IT DOES NOT CATCH" list in the same change.
  invariant(
    accepts(
      "const absent = async (selector) => await page.locator(selector).count() === 0; const a = await absent(" +
        pageAlert +
        ");"
    ) &&
      accepts("const a = await page.getByRole('alert', { name: 'x' }).count() === 0;") &&
      accepts("const a = !(await page.locator(" + pageAlert + ").isVisible());"),
    "widget-absence documented blind-spot drift"
  );
}
