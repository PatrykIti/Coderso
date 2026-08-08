export type FullSiteExplainMetrics = Readonly<{
  executionMs: number;
  emittedRows: number;
  scannedRows: number;
  sharedBuffers: number;
}>;

type ExplainRecord = Record<string, unknown>;

const EXPLAIN_INVALID = "managed_evidence_explain_invalid";
const OPTIONAL_REMOVAL_METRICS = [
  "Rows Removed by Filter",
  "Rows Removed by Join Filter",
  "Rows Removed by Index Recheck",
] as const;
const OPTIONAL_BUFFER_METRICS = [
  "Shared Hit Blocks",
  "Shared Read Blocks",
  "Shared Dirtied Blocks",
  "Shared Written Blocks",
] as const;

const invalidExplain = (): never => {
  throw new Error(EXPLAIN_INVALID);
};

const isExplainRecord = (value: unknown): value is ExplainRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const asExplainRecord = (value: unknown): ExplainRecord =>
  isExplainRecord(value) ? value : invalidExplain();

const hasOwn = (record: ExplainRecord | readonly unknown[], key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const explainNumber = (record: ExplainRecord, key: string, required: boolean): number => {
  if (!hasOwn(record, key)) return required ? invalidExplain() : 0;
  const value = Reflect.get(record, key);
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : invalidExplain();
};

const finiteSum = (values: readonly number[]): number => {
  const sum = values.reduce((total, value) => total + value, 0);
  return Number.isFinite(sum) && sum >= 0 ? sum : invalidExplain();
};

const finiteProduct = (left: number, right: number): number => {
  const product = left * right;
  return Number.isFinite(product) && product >= 0 ? product : invalidExplain();
};

const parsePlanNode = (
  value: unknown,
  visited: WeakSet<object>
): { actualRows: number; actualLoops: number; scannedRows: number } => {
  const node = asExplainRecord(value);
  if (visited.has(node)) invalidExplain();
  visited.add(node);
  const actualRows = explainNumber(node, "Actual Rows", true);
  const actualLoops = explainNumber(node, "Actual Loops", true);
  const localRows = finiteSum([
    actualRows,
    ...OPTIONAL_REMOVAL_METRICS.map((key) => explainNumber(node, key, false)),
  ]);
  let scannedRows = finiteProduct(localRows, actualLoops);

  if (hasOwn(node, "Plans")) {
    const plans = Reflect.get(node, "Plans");
    const planRows = Array.isArray(plans) ? plans : invalidExplain();
    const length = Reflect.get(planRows, "length");
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
      invalidExplain();
    }
    for (let index = 0; index < length; index += 1) {
      if (!hasOwn(planRows, index)) invalidExplain();
      const child = parsePlanNode(Reflect.get(planRows, index), visited);
      scannedRows = finiteSum([scannedRows, child.scannedRows]);
    }
    if (Reflect.get(planRows, "length") !== length) invalidExplain();
  }
  return { actualRows, actualLoops, scannedRows };
};

export const parseManagedEvidenceExplainMetrics = (input: unknown): FullSiteExplainMetrics => {
  try {
    const document: unknown = typeof input === "string" ? JSON.parse(input) : input;
    const results = Array.isArray(document) ? document : invalidExplain();
    const topLevelLength = Reflect.get(results, "length");
    if (topLevelLength !== 1 || !hasOwn(results, 0)) invalidExplain();
    const result = asExplainRecord(Reflect.get(results, 0));
    if (!hasOwn(result, "Plan")) invalidExplain();
    const rootRecord = asExplainRecord(Reflect.get(result, "Plan"));
    const root = parsePlanNode(rootRecord, new WeakSet<object>());
    const metrics = Object.freeze({
      executionMs: explainNumber(result, "Execution Time", true),
      emittedRows: finiteProduct(root.actualRows, root.actualLoops),
      scannedRows: root.scannedRows,
      sharedBuffers: finiteSum(
        OPTIONAL_BUFFER_METRICS.map((key) => explainNumber(rootRecord, key, false))
      ),
    });
    if (Reflect.get(results, "length") !== topLevelLength) invalidExplain();
    return metrics;
  } catch {
    throw new Error(EXPLAIN_INVALID);
  }
};
