import type { JsonObject } from "../fullSitePackage/types";

const strictRecord = (
  value: unknown,
  allowed: readonly string[],
  code: string
): Record<string, unknown> => {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(code);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new Error(code);
  return record;
};

const assertStableIds = (values: readonly unknown[], code: string): void => {
  const ids = values.map((value) => {
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id.trim()) throw new Error(code);
    return record.id.trim();
  });
  if (new Set(ids).size !== ids.length) throw new Error(code);
};

export const assertFormNestedContract = (desired: JsonObject): void => {
  const fields = (desired.fields ?? []) as unknown[];
  const actions = (desired.actions ?? []) as unknown[];
  assertStableIds(fields, "form_invalid");
  assertStableIds(actions, "form_invalid");
  for (const field of fields) {
    strictRecord(
      field,
      ["id", "type", "label", "name", "required", "settings", "orderIndex"],
      "form_invalid"
    );
  }
  const actionConfigKeys: Record<string, readonly string[]> = {
    email: ["to", "subject", "text", "html", "fromName", "fromEmail"],
    webhook: ["url", "method", "headers", "timeoutMs", "includeSubmission", "bodyTemplate"],
    entry_sync: ["contentTypeId", "mode", "titleTemplate", "slugTemplate", "dataMapping"],
    redirect: ["url"],
    success_message: ["message"],
  };
  for (const action of actions) {
    const record = strictRecord(
      action,
      ["id", "type", "label", "enabled", "continueOnError", "condition", "config", "orderIndex"],
      "form_invalid"
    );
    const configKeys = typeof record.type === "string" ? actionConfigKeys[record.type] : undefined;
    if (!configKeys) throw new Error("form_invalid");
    strictRecord(record.config, configKeys, "form_invalid");
    if (record.condition !== undefined) {
      const condition = strictRecord(
        record.condition,
        ["operator", "field", "value"],
        "form_invalid"
      );
      if (condition.operator === "always" && Object.keys(condition).length !== 1) {
        throw new Error("form_invalid");
      }
      if (
        (condition.operator === "exists" || condition.operator === "not_exists") &&
        Object.prototype.hasOwnProperty.call(condition, "value")
      ) {
        throw new Error("form_invalid");
      }
    }
  }
  if (desired.settings !== undefined) {
    const settings = strictRecord(
      desired.settings,
      ["layoutMode", "saveProgress", "stepTitles", "preset", "automationRetry", "theme"],
      "form_invalid"
    );
    if (settings.automationRetry !== undefined) {
      strictRecord(
        settings.automationRetry,
        ["enabled", "maxAttempts", "baseDelayMs", "maxDelayMs"],
        "form_invalid"
      );
    }
    if (settings.theme !== undefined) {
      const theme = strictRecord(
        settings.theme,
        ["layout", "surface", "typography", "input", "submit"],
        "form_invalid"
      );
      const groups: Record<string, readonly string[]> = {
        layout: ["width", "align", "fieldGap", "columns", "buttonAlignment"],
        surface: [
          "card",
          "background",
          "borderColor",
          "borderWidth",
          "radius",
          "padding",
          "shadow",
        ],
        typography: [
          "titleSize",
          "titleWeight",
          "titleColor",
          "labelColor",
          "helperColor",
          "fontFamily",
        ],
        input: ["size", "radius", "borderColor", "background", "textColor"],
        submit: ["background", "textColor", "radius", "fullWidth", "label", "supportingText"],
      };
      for (const [key, value] of Object.entries(theme)) {
        strictRecord(value, groups[key]!, "form_invalid");
      }
    }
  }
};

export const assertMenuItemContract = (item: unknown): void => {
  const record = strictRecord(
    item,
    ["id", "label", "href", "pageId", "parentId", "orderIndex", "settings"],
    "menu_invalid"
  );
  if (record.settings !== undefined) {
    const settings = strictRecord(
      record.settings,
      ["visibility", "badge", "description", "icon", "openInNewTab", "variant"],
      "menu_invalid"
    );
    if (settings.badge !== undefined) {
      strictRecord(settings.badge, ["label", "tone"], "menu_invalid");
    }
  }
};
