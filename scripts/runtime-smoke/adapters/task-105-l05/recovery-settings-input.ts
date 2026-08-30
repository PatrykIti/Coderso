import { SmokeError } from "../../contracts";

const APPLY_SETTING_KEYS = Object.freeze([
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "site.homepageId",
  "site.adminPath",
] as const);

type ApplySettingKey = (typeof APPLY_SETTING_KEYS)[number];

function outputFailure(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function isApplySettingKey(value: string): value is ApplySettingKey {
  return (APPLY_SETTING_KEYS as readonly string[]).includes(value);
}

function requireJsonValue(valueJson: string): void {
  try {
    JSON.parse(valueJson);
  } catch {
    outputFailure("TASK-105 L05 recovery setting JSON is invalid");
  }
}

/** Validates the closed five-key mutation payload before a recovery transaction. */
export function requireExactTask105L05ApplyRows(
  rows: readonly Readonly<{ readonly key: string; readonly valueJson: string }>[]
): readonly Readonly<{ readonly key: ApplySettingKey; readonly valueJson: string }>[] {
  if (!Array.isArray(rows) || rows.length !== APPLY_SETTING_KEYS.length) {
    outputFailure("TASK-105 L05 recovery setting rows are invalid");
  }
  const seen = new Set<string>();
  const output = rows.map((row) => {
    if (
      row === null ||
      typeof row !== "object" ||
      Object.getPrototypeOf(row) !== Object.prototype ||
      Object.keys(row).length !== 2 ||
      !("key" in row) ||
      !("valueJson" in row) ||
      !isApplySettingKey(row.key) ||
      seen.has(row.key) ||
      typeof row.valueJson !== "string" ||
      row.valueJson.length === 0 ||
      row.valueJson.length > 32 * 1024
    ) {
      outputFailure("TASK-105 L05 recovery setting rows are invalid");
    }
    requireJsonValue(row.valueJson);
    seen.add(row.key);
    return Object.freeze({ key: row.key, valueJson: row.valueJson });
  });
  if (APPLY_SETTING_KEYS.some((key) => !seen.has(key))) {
    outputFailure("TASK-105 L05 recovery setting key set is invalid");
  }
  return Object.freeze(output);
}
