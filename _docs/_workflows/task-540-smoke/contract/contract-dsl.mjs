import { deepFreezeExact, exactKeys, invariant } from "./core.mjs";

export function schemaLiteral(value) {
  return deepFreezeExact({ type: "literal", value });
}

export function schemaBoolean() {
  return deepFreezeExact({ type: "boolean" });
}

export function schemaNull() {
  return deepFreezeExact({ type: "null" });
}

export function schemaString({ minLength = 0, maxLength = 4096, enumValues = null, format = null } = {}) {
  return deepFreezeExact({
    type: "string",
    minLength,
    maxLength,
    enum: enumValues,
    format,
  });
}

export function schemaNumber({ minimum = null, maximum = null } = {}) {
  return deepFreezeExact({ type: "number", minimum, maximum });
}

export function schemaInteger({ minimum = null, maximum = null } = {}) {
  return deepFreezeExact({ type: "integer", minimum, maximum });
}

export function schemaArray(items, { minItems = 0, maxItems = 1024, unique = false } = {}) {
  return deepFreezeExact({ type: "array", items, minItems, maxItems, unique });
}

export function schemaTuple(items) {
  return deepFreezeExact({ type: "tuple", items });
}

export function schemaObject(properties) {
  invariant(
    properties && Object.getPrototypeOf(properties) === Object.prototype,
    "schema object properties must be plain"
  );
  return deepFreezeExact({ type: "object", properties });
}

export function schemaUnion(variants) {
  return deepFreezeExact({ type: "union", variants });
}

export function outputRef(path = []) {
  return deepFreezeExact({ op: "output", path });
}

export function literalPredicateRef(value) {
  return deepFreezeExact({ op: "literal", value });
}

export function deepEqualPredicate(left, right) {
  return deepFreezeExact({ op: "deepEqual", left, right });
}

export function andPredicate(items) {
  return deepFreezeExact({ op: "and", items });
}

export function comparePredicate(mode, left, right) {
  return deepFreezeExact({ op: "compare", mode, left, right });
}

export function sameSetPredicate(left, right) {
  return deepFreezeExact({ op: "sameSet", left, right, duplicates: "reject" });
}

export function notPredicate(item) {
  return deepFreezeExact({ op: "not", item });
}

export function withinPredicate(actual, expected, tolerance) {
  return deepFreezeExact({ op: "within", actual, expected, tolerance });
}

export function everyPredicate(source, as, predicate) {
  return deepFreezeExact({ op: "every", source, as, predicate });
}

export function varRef(name, path = []) {
  return deepFreezeExact({ op: "var", name, path });
}

export function lengthRef(value) {
  return deepFreezeExact({ op: "length", value });
}

export function jsonTransport(jsonLayers = 1) {
  return deepFreezeExact({
    encoding: "json",
    jsonLayers,
    nativeMode: null,
    exactText: null,
    sessionName: null,
    normalizedValue: null,
  });
}

export function nativeExactTransport(exactText, normalizedValue) {
  return deepFreezeExact({
    encoding: "native",
    jsonLayers: 0,
    nativeMode: "exact-text",
    exactText,
    sessionName: null,
    normalizedValue,
  });
}

export function nativeSessionAbsenceTransport(sessionName) {
  return deepFreezeExact({
    encoding: "native",
    jsonLayers: 0,
    nativeMode: "session-list-absence",
    exactText: null,
    sessionName,
    normalizedValue: true,
  });
}

export function outputContract({ grammar, schema, predicate, rememberAs = null }) {
  return deepFreezeExact({ grammar, schema, predicate, rememberAs });
}

export function outputEquals(path, expected) {
  return deepEqualPredicate(outputRef(path), literalPredicateRef(expected));
}

export function outputNonEmpty(path) {
  return deepFreezeExact({ op: "nonEmptyString", value: outputRef(path) });
}

export function outputLengthEquals(path, expected) {
  return deepEqualPredicate(lengthRef(outputRef(path)), literalPredicateRef(expected));
}

export function assertExactUnitOutputValue(value) {
  exactKeys(value, ["ok"], "unit output");
  invariant(value.ok === true, "unit output ok value drift");
  return value;
}

export function capturePredicateRef(name) {
  return deepFreezeExact({ op: "capture", name });
}

export function fixturePredicateRef(path) {
  return deepFreezeExact({ op: "fixture", path });
}

export function priorPredicateRef(actionId, path = []) {
  return deepFreezeExact({ op: "prior", actionId, path });
}

export function pathPredicateRef(key) {
  return deepFreezeExact({ op: "path", key });
}

export function arrayPredicateRef(items) {
  return deepFreezeExact({ op: "array", items });
}

export function subtractionPredicateRef(left, right) {
  return deepFreezeExact({ op: "sub", left, right });
}

export function observationRef(path = []) {
  return outputRef(["observations", ...path]);
}

export function observationEquals(path, expected) {
  return deepEqualPredicate(observationRef(path), literalPredicateRef(expected));
}

export function observationEqualsRef(path, expected) {
  return deepEqualPredicate(observationRef(path), expected);
}

export function observationNonEmpty(path) {
  return deepFreezeExact({ op: "nonEmptyString", value: observationRef(path) });
}

export function observationLengthEquals(path, expected) {
  return deepEqualPredicate(lengthRef(observationRef(path)), literalPredicateRef(expected));
}

export function positiveRectRefPredicate(ref) {
  return andPredicate([
    comparePredicate(
      "gt",
      deepFreezeExact({ ...ref, path: [...ref.path, "width"] }),
      literalPredicateRef(0)
    ),
    comparePredicate(
      "gt",
      deepFreezeExact({ ...ref, path: [...ref.path, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

export function zeroRectRefPredicate(ref) {
  return andPredicate([
    deepEqualPredicate(
      deepFreezeExact({ ...ref, path: [...ref.path, "width"] }),
      literalPredicateRef(0)
    ),
    deepEqualPredicate(
      deepFreezeExact({ ...ref, path: [...ref.path, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

export function everyPositiveObservationRect(path, variableName) {
  return everyPredicate(
    observationRef(path),
    variableName,
    positiveRectRefPredicate(varRef(variableName))
  );
}

export function everyZeroObservationRect(path, variableName) {
  return everyPredicate(
    observationRef(path),
    variableName,
    zeroRectRefPredicate(varRef(variableName))
  );
}
