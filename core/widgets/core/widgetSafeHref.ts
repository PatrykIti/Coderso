export type WidgetSafeHrefOptions = {
  allowRelative?: boolean;
  allowHash?: boolean;
  allowHttp?: boolean;
  openInNewTab?: boolean;
};

export type WidgetLinkAttrs = {
  href: string;
  target?: "_blank";
  rel?: string;
};

const rejectedProtocolPattern = /^(?:javascript|data|vbscript):/i;

export function normalizeWidgetSafeHref(
  value: unknown,
  options: WidgetSafeHrefOptions = {}
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  if (rejectedProtocolPattern.test(trimmed)) return undefined;
  if (options.allowHash && trimmed.startsWith("#")) return trimmed;
  if (options.allowRelative && trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!options.allowHttp) return undefined;
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export function resolveWidgetLinkAttrs(
  value: unknown,
  options: WidgetSafeHrefOptions = {}
): WidgetLinkAttrs | undefined {
  const href = normalizeWidgetSafeHref(value, options);
  if (!href) return undefined;

  if (options.openInNewTab) {
    return {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return {
      href,
      rel: "noopener noreferrer",
    };
  }

  return { href };
}
