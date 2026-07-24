import path from "node:path";

import {
  ALLOWED_SECRET_NAMES,
  SAFE_IDENTIFIER_PATTERN,
  SAFE_PATH_KEY_PATTERN,
} from "./config.mjs";
import {
  canonicalJson,
  exactOwnKeys,
  invariant,
} from "./foundation.mjs";
import {
  deepEqualJson,
} from "./resource-contracts.mjs";
import {
  assertDenseJsonArray,
  assertPlainJsonValue,
  isSafeRepositoryRelativePath,
} from "./json-schema.mjs";

function assertRefPath(value, label, { nonEmpty = false } = {}) {
  assertDenseJsonArray(value, label);
  invariant(!nonEmpty || value.length > 0, label + " must not be empty");
  invariant(value.length <= 32, label + " is too deep");
  for (const part of value) {
    invariant(
      typeof part === "string" &&
        part.length > 0 &&
        part.length <= 128 &&
        !["__proto__", "prototype", "constructor"].includes(part),
      label + " contains an invalid segment"
    );
  }
}

function assertRefDescriptor(ref, label, depth = 0) {
  invariant(depth <= 32, label + " exceeds Ref depth");
  if (depth === 0) assertPlainJsonValue(ref, label + " Ref descriptor");
  invariant(ref && typeof ref === "object" && !Array.isArray(ref), label + " must be a Ref object");
  invariant(Object.getPrototypeOf(ref) === Object.prototype, label + " must be a plain Ref object");
  invariant(typeof ref.op === "string", label + " Ref opcode is invalid");
  if (ref.op === "literal") {
    exactOwnKeys(ref, ["op", "value"], label, { plain: true });
    assertPlainJsonValue(ref.value, label + " literal");
    return;
  }
  if (ref.op === "secret") {
    exactOwnKeys(ref, ["op", "name"], label, { plain: true });
    invariant(ALLOWED_SECRET_NAMES.has(ref.name), label + " secret is not allowlisted");
    return;
  }
  if (ref.op === "capture") {
    exactOwnKeys(ref, ["op", "name"], label, { plain: true });
    invariant(
      typeof ref.name === "string" && SAFE_IDENTIFIER_PATTERN.test(ref.name),
      label + " capture name is invalid"
    );
    return;
  }
  if (ref.op === "fixture") {
    exactOwnKeys(ref, ["op", "path"], label, { plain: true });
    assertRefPath(ref.path, label + " path", { nonEmpty: true });
    return;
  }
  if (ref.op === "prior") {
    exactOwnKeys(ref, ["op", "actionId", "path"], label, { plain: true });
    invariant(
      typeof ref.actionId === "string" && ref.actionId.length > 0 && ref.actionId.length <= 128,
      label + " actionId is invalid"
    );
    assertRefPath(ref.path, label + " path");
    return;
  }
  if (ref.op === "output") {
    exactOwnKeys(ref, ["op", "path"], label, { plain: true });
    assertRefPath(ref.path, label + " path");
    return;
  }
  if (ref.op === "var") {
    exactOwnKeys(ref, ["op", "name", "path"], label, { plain: true });
    invariant(
      typeof ref.name === "string" && SAFE_IDENTIFIER_PATTERN.test(ref.name),
      label + " variable name is invalid"
    );
    assertRefPath(ref.path, label + " path");
    return;
  }
  if (ref.op === "rootPath") {
    exactOwnKeys(ref, ["op", "parts"], label, { plain: true });
    assertDenseJsonArray(ref.parts, label + " parts");
    invariant(
      ref.parts.length > 0 && ref.parts.length <= 32,
      label + " rootPath parts are invalid"
    );
    ref.parts.forEach((part, index) =>
      assertRefDescriptor(part, label + " parts[" + index + "]", depth + 1)
    );
    return;
  }
  if (ref.op === "selector") {
    exactOwnKeys(ref, ["op", "templateId", "args"], label, { plain: true });
    invariant(
      typeof ref.templateId === "string" && SAFE_PATH_KEY_PATTERN.test(ref.templateId),
      label + " templateId is invalid"
    );
    assertDenseJsonArray(ref.args, label + " args");
    invariant(ref.args.length <= 16, label + " selector has too many arguments");
    ref.args.forEach((argument, index) =>
      assertRefDescriptor(argument, label + " args[" + index + "]", depth + 1)
    );
    return;
  }
  if (ref.op === "path") {
    exactOwnKeys(ref, ["op", "key"], label, { plain: true });
    invariant(
      typeof ref.key === "string" && SAFE_PATH_KEY_PATTERN.test(ref.key),
      label + " path key is invalid"
    );
    return;
  }
  if (ref.op === "array") {
    exactOwnKeys(ref, ["op", "items"], label, { plain: true });
    assertDenseJsonArray(ref.items, label + " items");
    ref.items.forEach((item, index) =>
      assertRefDescriptor(item, label + " items[" + index + "]", depth + 1)
    );
    return;
  }
  if (ref.op === "object") {
    exactOwnKeys(ref, ["op", "properties"], label, { plain: true });
    invariant(
      ref.properties &&
        typeof ref.properties === "object" &&
        !Array.isArray(ref.properties) &&
        Object.getPrototypeOf(ref.properties) === Object.prototype,
      label + " properties must be plain"
    );
    invariant(
      Reflect.ownKeys(ref.properties).every((key) => typeof key === "string"),
      label + " properties have symbols"
    );
    for (const [key, child] of Object.entries(ref.properties)) {
      invariant(SAFE_PATH_KEY_PATTERN.test(key), label + " property key is invalid");
      assertRefDescriptor(child, label + "." + key, depth + 1);
    }
    return;
  }
  if (ref.op === "sub") {
    exactOwnKeys(ref, ["op", "left", "right"], label, { plain: true });
    assertRefDescriptor(ref.left, label + " left", depth + 1);
    assertRefDescriptor(ref.right, label + " right", depth + 1);
    return;
  }
  if (ref.op === "length") {
    exactOwnKeys(ref, ["op", "value"], label, { plain: true });
    assertRefDescriptor(ref.value, label + " value", depth + 1);
    return;
  }
  if (ref.op === "changedKeys") {
    exactOwnKeys(ref, ["op", "before", "after"], label, { plain: true });
    assertRefDescriptor(ref.before, label + " before", depth + 1);
    assertRefDescriptor(ref.after, label + " after", depth + 1);
    return;
  }
  invariant(false, label + " Ref opcode is not registered");
}

function readRefPath(value, parts, label) {
  let current = value;
  for (const part of parts) {
    invariant(
      current !== null && typeof current === "object" && Object.hasOwn(current, part),
      label + " path is absent"
    );
    current = current[part];
  }
  return current;
}

function jsonPointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function changedJsonPointers(before, after) {
  assertPlainJsonValue(before, "changedKeys before");
  assertPlainJsonValue(after, "changedKeys after");
  invariant(
    before !== null &&
      after !== null &&
      typeof before === "object" &&
      typeof after === "object" &&
      Array.isArray(before) === Array.isArray(after),
    "changedKeys roots must be matching JSON composites"
  );
  const changed = [];
  const visit = (left, right, pointer) => {
    if (deepEqualJson(left, right)) return;
    const leftComposite = left !== null && typeof left === "object";
    const rightComposite = right !== null && typeof right === "object";
    if (!leftComposite || !rightComposite || Array.isArray(left) !== Array.isArray(right)) {
      invariant(pointer.length > 0, "changedKeys cannot emit an empty root pointer");
      changed.push(pointer);
      return;
    }
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      const childPointer = pointer + "/" + jsonPointerSegment(key);
      if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) changed.push(childPointer);
      else visit(left[key], right[key], childPointer);
    }
  };
  visit(before, after, "");
  return [...new Set(changed)].sort();
}

function expandRegisteredPath(plan, key, captures) {
  invariant(
    plan?.fixtureBlueprint?.paths && Object.hasOwn(plan.fixtureBlueprint.paths, key),
    "path Ref is not registered"
  );
  const descriptor = plan.fixtureBlueprint.paths[key];
  let expanded;
  if (typeof descriptor === "string") {
    invariant(!/[{}]/u.test(descriptor), "registered path contains unresolved braces");
    expanded = descriptor;
  } else {
    exactOwnKeys(descriptor, ["template", "captures"], "registered path template");
    invariant(typeof descriptor.template === "string", "registered path template is invalid");
    assertDenseJsonArray(descriptor.captures, "registered path captures");
    invariant(
      new Set(descriptor.captures).size === descriptor.captures.length,
      "registered path captures repeat"
    );
    expanded = descriptor.template;
    for (const captureName of descriptor.captures) {
      invariant(
        typeof captureName === "string" && captureName.length > 0,
        "registered path capture is invalid"
      );
      const placeholder = "{" + captureName + "}";
      invariant(
        expanded.split(placeholder).length === 2,
        "registered path capture occurrence mismatch"
      );
      expanded = expanded.replace(placeholder, encodeURIComponent(captures.get(captureName)));
    }
    invariant(!/[{}]/u.test(expanded), "registered path contains unresolved braces");
  }
  if (/^https?:\/\//u.test(expanded) || expanded.startsWith("#")) return expanded;
  invariant(
    expanded.startsWith("/") && !expanded.startsWith("//"),
    "registered path must be Admin-relative"
  );
  const adminOrigin = plan.fixtureBlueprint.origins?.admin;
  invariant(
    typeof adminOrigin === "string" && /^https?:\/\/[^/]+$/u.test(adminOrigin),
    "Admin origin is invalid"
  );
  return adminOrigin + expanded;
}

function resolveExactRef(ref, context, label = "Ref") {
  assertRefDescriptor(ref, label);
  if (ref.op === "literal") {
    invariant(
      typeof ref.value !== "string" || !ref.value.startsWith("$"),
      label + " cannot encode a secret reference as a literal"
    );
    return ref.value;
  }
  if (ref.op === "secret") return ref.name;
  if (ref.op === "capture") return context.captures.get(ref.name);
  if (ref.op === "fixture") return readRefPath(context.plan.fixtureBlueprint, ref.path, label);
  if (ref.op === "prior") {
    invariant(context.priorOutputs.has(ref.actionId), label + " prior output is absent");
    return readRefPath(context.priorOutputs.get(ref.actionId), ref.path, label);
  }
  if (ref.op === "output") return readRefPath(context.currentOutput, ref.path, label);
  if (ref.op === "var") {
    invariant(context.variables.has(ref.name), label + " variable is absent");
    return readRefPath(context.variables.get(ref.name), ref.path, label);
  }
  if (ref.op === "rootPath") {
    invariant(
      typeof context.root === "string" &&
        path.isAbsolute(context.root) &&
        path.resolve(context.root) === context.root,
      label + " root authority is invalid"
    );
    const parts = ref.parts.map((part, index) =>
      resolveExactRef(part, context, label + " parts[" + index + "]")
    );
    const normalized = [];
    for (const part of parts) {
      invariant(
        typeof part === "string" && part.length > 0 && part.length <= 1024 && !part.includes("\0"),
        label + " rootPath segment is invalid"
      );
      invariant(
        !path.isAbsolute(part) && !part.includes("\\"),
        label + " rootPath segment must be relative"
      );
      const segments = part.split("/");
      invariant(
        segments.every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
        label + " rootPath traverses"
      );
      normalized.push(...segments);
    }
    const resolved = path.resolve(context.root, ...normalized);
    invariant(
      resolved.startsWith(context.root + path.sep),
      label + " rootPath escapes repository root"
    );
    return resolved;
  }
  if (ref.op === "selector") {
    const template = context.plan.registries?.selectors?.[ref.templateId];
    invariant(template !== undefined, label + " selector template is not registered");
    const args = ref.args.map((argument, index) =>
      resolveExactRef(argument, context, label + " args[" + index + "]")
    );
    return renderSelectorTemplate(template, args, ref.templateId);
  }
  if (ref.op === "path") return expandRegisteredPath(context.plan, ref.key, context.captures);
  if (ref.op === "array")
    return ref.items.map((item, index) =>
      resolveExactRef(item, context, label + " items[" + index + "]")
    );
  if (ref.op === "object") {
    return Object.fromEntries(
      Object.entries(ref.properties).map(([key, child]) => [
        key,
        resolveExactRef(child, context, label + "." + key),
      ])
    );
  }
  if (ref.op === "sub") {
    const left = resolveExactRef(ref.left, context, label + " left");
    const right = resolveExactRef(ref.right, context, label + " right");
    invariant(
      typeof left === "number" &&
        Number.isFinite(left) &&
        typeof right === "number" &&
        Number.isFinite(right),
      label + " subtraction operands are invalid"
    );
    const result = left - right;
    invariant(Number.isFinite(result), label + " subtraction result is non-finite");
    return result;
  }
  if (ref.op === "length") {
    const value = resolveExactRef(ref.value, context, label + " value");
    invariant(
      typeof value === "string" || Array.isArray(value),
      label + " length operand is invalid"
    );
    return value.length;
  }
  if (ref.op === "changedKeys") {
    return changedJsonPointers(
      resolveExactRef(ref.before, context, label + " before"),
      resolveExactRef(ref.after, context, label + " after")
    );
  }
  invariant(false, label + " Ref opcode is not implemented");
}

function assertPredicateDescriptor(predicate, label, depth = 0) {
  invariant(depth <= 32, label + " exceeds Predicate depth");
  if (depth === 0) assertPlainJsonValue(predicate, label + " Predicate descriptor");
  invariant(
    predicate && typeof predicate === "object" && !Array.isArray(predicate),
    label + " must be a Predicate object"
  );
  invariant(
    Object.getPrototypeOf(predicate) === Object.prototype,
    label + " must be a plain Predicate object"
  );
  if (predicate.op === "and" || predicate.op === "or") {
    exactOwnKeys(predicate, ["op", "items"], label, { plain: true });
    assertDenseJsonArray(predicate.items, label + " items");
    invariant(predicate.items.length > 0, label + " items must not be empty");
    predicate.items.forEach((item, index) =>
      assertPredicateDescriptor(item, label + " items[" + index + "]", depth + 1)
    );
    return;
  }
  if (predicate.op === "not") {
    exactOwnKeys(predicate, ["op", "item"], label, { plain: true });
    assertPredicateDescriptor(predicate.item, label + " item", depth + 1);
    return;
  }
  if (predicate.op === "deepEqual") {
    exactOwnKeys(predicate, ["op", "left", "right"], label, { plain: true });
    assertRefDescriptor(predicate.left, label + " left");
    assertRefDescriptor(predicate.right, label + " right");
    return;
  }
  if (predicate.op === "sameSet") {
    exactOwnKeys(predicate, ["op", "left", "right", "duplicates"], label, { plain: true });
    invariant(predicate.duplicates === "reject", label + " duplicate policy is invalid");
    assertRefDescriptor(predicate.left, label + " left");
    assertRefDescriptor(predicate.right, label + " right");
    return;
  }
  if (predicate.op === "compare") {
    exactOwnKeys(predicate, ["op", "mode", "left", "right"], label, { plain: true });
    invariant(
      ["gt", "gte", "lt", "lte"].includes(predicate.mode),
      label + " compare mode is invalid"
    );
    assertRefDescriptor(predicate.left, label + " left");
    assertRefDescriptor(predicate.right, label + " right");
    return;
  }
  if (predicate.op === "within") {
    exactOwnKeys(predicate, ["op", "actual", "expected", "tolerance"], label, { plain: true });
    assertRefDescriptor(predicate.actual, label + " actual");
    assertRefDescriptor(predicate.expected, label + " expected");
    assertRefDescriptor(predicate.tolerance, label + " tolerance");
    return;
  }
  if (predicate.op === "every") {
    exactOwnKeys(predicate, ["op", "source", "as", "predicate"], label, { plain: true });
    invariant(
      typeof predicate.as === "string" && SAFE_IDENTIFIER_PATTERN.test(predicate.as),
      label + " binding name is invalid"
    );
    assertRefDescriptor(predicate.source, label + " source");
    assertPredicateDescriptor(predicate.predicate, label + " predicate", depth + 1);
    return;
  }
  if (predicate.op === "nonEmptyString") {
    exactOwnKeys(predicate, ["op", "value"], label, { plain: true });
    assertRefDescriptor(predicate.value, label + " value");
    return;
  }
  invariant(false, label + " Predicate opcode is not registered");
}

function evaluateExactPredicate(predicate, context, label = "Predicate") {
  assertPredicateDescriptor(predicate, label);
  if (predicate.op === "and")
    return predicate.items.every((item, index) =>
      evaluateExactPredicate(item, context, label + " items[" + index + "]")
    );
  if (predicate.op === "or")
    return predicate.items.some((item, index) =>
      evaluateExactPredicate(item, context, label + " items[" + index + "]")
    );
  if (predicate.op === "not")
    return !evaluateExactPredicate(predicate.item, context, label + " item");
  if (predicate.op === "deepEqual") {
    const left = resolveExactRef(predicate.left, context, label + " left");
    const right = resolveExactRef(predicate.right, context, label + " right");
    assertPlainJsonValue(left, label + " left value");
    assertPlainJsonValue(right, label + " right value");
    return deepEqualJson(left, right);
  }
  if (predicate.op === "sameSet") {
    const left = resolveExactRef(predicate.left, context, label + " left");
    const right = resolveExactRef(predicate.right, context, label + " right");
    assertDenseJsonArray(left, label + " left set");
    assertDenseJsonArray(right, label + " right set");
    left.forEach((item, index) => assertPlainJsonValue(item, label + " left[" + index + "]"));
    right.forEach((item, index) => assertPlainJsonValue(item, label + " right[" + index + "]"));
    const leftKeys = left.map(canonicalJson);
    const rightKeys = right.map(canonicalJson);
    invariant(new Set(leftKeys).size === leftKeys.length, label + " left set contains duplicates");
    invariant(
      new Set(rightKeys).size === rightKeys.length,
      label + " right set contains duplicates"
    );
    return leftKeys.length === rightKeys.length && leftKeys.every((key) => rightKeys.includes(key));
  }
  if (predicate.op === "compare") {
    const left = resolveExactRef(predicate.left, context, label + " left");
    const right = resolveExactRef(predicate.right, context, label + " right");
    invariant(
      typeof left === "number" &&
        Number.isFinite(left) &&
        typeof right === "number" &&
        Number.isFinite(right),
      label + " compare values are invalid"
    );
    if (predicate.mode === "gt") return left > right;
    if (predicate.mode === "gte") return left >= right;
    if (predicate.mode === "lt") return left < right;
    return left <= right;
  }
  if (predicate.op === "within") {
    const actual = resolveExactRef(predicate.actual, context, label + " actual");
    const expected = resolveExactRef(predicate.expected, context, label + " expected");
    const tolerance = resolveExactRef(predicate.tolerance, context, label + " tolerance");
    invariant(
      typeof actual === "number" &&
        Number.isFinite(actual) &&
        typeof expected === "number" &&
        Number.isFinite(expected) &&
        typeof tolerance === "number" &&
        Number.isFinite(tolerance) &&
        tolerance >= 0,
      label + " tolerance values are invalid"
    );
    return Math.abs(actual - expected) <= tolerance;
  }
  if (predicate.op === "every") {
    const source = resolveExactRef(predicate.source, context, label + " source");
    assertDenseJsonArray(source, label + " source");
    invariant(!context.variables.has(predicate.as), label + " variable shadowing is forbidden");
    return source.every((value, index) => {
      const variables = new Map(context.variables);
      variables.set(predicate.as, value);
      return evaluateExactPredicate(
        predicate.predicate,
        { ...context, variables },
        label + " predicate[" + index + "]"
      );
    });
  }
  if (predicate.op === "nonEmptyString") {
    const value = resolveExactRef(predicate.value, context, label + " value");
    return typeof value === "string" && value.length > 0;
  }
  invariant(false, label + " Predicate opcode is not implemented");
}

function encodeSelectorSlot(value) {
  invariant(typeof value === "string", "selector slot must resolve to a string");
  invariant(
    value.length <= 512 && !value.includes("\0") && !/[\r\n]/.test(value),
    "selector slot is not bounded"
  );
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function renderSelectorTemplate(template, args, label) {
  exactOwnKeys(
    template,
    ["kind", "minArity", "maxArity", "parts", "slots", "optionalDefaults"],
    label + " selector template"
  );
  invariant(
    template.kind === "selector-template" &&
      Number.isInteger(template.minArity) &&
      Number.isInteger(template.maxArity) &&
      template.minArity >= 0 &&
      template.maxArity >= template.minArity &&
      args.length >= template.minArity &&
      args.length <= template.maxArity &&
      template.parts.length === template.slots.length + 1,
    label + " selector arity drift"
  );
  const resolvedArgs = Array.from({ length: template.maxArity }, (_, index) => {
    if (index < args.length) return args[index];
    invariant(
      Object.hasOwn(template.optionalDefaults, index),
      label + " selector default is missing"
    );
    return template.optionalDefaults[index];
  });
  let output = template.parts[0];
  for (const [index, slot] of template.slots.entries()) {
    exactOwnKeys(slot, ["argIndex", "encoding"], label + " selector slot");
    invariant(slot.encoding === "css-string", label + " selector encoding drift");
    output += encodeSelectorSlot(resolvedArgs[slot.argIndex]) + template.parts[index + 1];
  }
  output = output.trim();
  invariant(output.length > 0 && output.length <= 4096, label + " selector output is invalid");
  return output;
}

function registeredSelector(plan, key, args = []) {
  invariant(
    Object.hasOwn(plan.registries.selectors, key),
    "selector key is not registered: " + key
  );
  return renderSelectorTemplate(plan.registries.selectors[key], args, key);
}

export {
  assertPredicateDescriptor,
  assertRefDescriptor,
  assertRefPath,
  changedJsonPointers,
  encodeSelectorSlot,
  evaluateExactPredicate,
  expandRegisteredPath,
  jsonPointerSegment,
  readRefPath,
  registeredSelector,
  renderSelectorTemplate,
  resolveExactRef,
};
