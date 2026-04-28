export type FormActionTemplateContext = {
  formId: string;
  submissionId: string;
  submission: Record<string, unknown>;
  meta: {
    createdAt: string;
  };
};

const TEMPLATE_PATTERN = /\{\{\s*([^{}\s]+)\s*\}\}/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPathValue = (source: unknown, path: string): unknown => {
  const parts = path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return undefined;

  let current: unknown = source;
  for (const part of parts) {
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[Number(part)];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[part];
  }

  return current;
};

const toTemplateString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

export function resolveTemplateToken(
  token: string,
  context: FormActionTemplateContext
): unknown {
  if (token === "formId") return context.formId;
  if (token === "submissionId") return context.submissionId;
  if (token === "meta.createdAt") return context.meta.createdAt;
  if (token.startsWith("submission.")) {
    return readPathValue(context.submission, token.slice("submission.".length));
  }
  return readPathValue(context.submission, token);
}

export function renderTemplateString(
  template: string,
  context: FormActionTemplateContext
) {
  return template.replace(TEMPLATE_PATTERN, (_, token: string) => {
    const value = resolveTemplateToken(token, context);
    return toTemplateString(value);
  });
}

export function renderTemplateRecord(
  input: Record<string, string>,
  context: FormActionTemplateContext
) {
  const result: Record<string, string> = {};
  for (const [key, template] of Object.entries(input)) {
    result[key] = renderTemplateString(template, context);
  }
  return result;
}

export function renderTemplateJsonValue(
  value: unknown,
  context: FormActionTemplateContext
): unknown {
  if (typeof value === "string") {
    return renderTemplateString(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => renderTemplateJsonValue(entry, context));
  }
  if (!isRecord(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = renderTemplateJsonValue(entry, context);
  }
  return result;
}
