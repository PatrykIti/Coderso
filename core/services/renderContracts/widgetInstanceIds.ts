const unsafeCharacterPattern = /[^a-zA-Z0-9_-]+/g;

function sanitizeIdSegment(value: string): string {
  const normalized = value.trim().replace(unsafeCharacterPattern, "-").replace(/-+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "widget";
}

export function createWidgetInstanceId(
  type: string,
  blockId: string | undefined,
  fallbackSeed: string
): string {
  const source = blockId && blockId.trim().length > 0 ? blockId : fallbackSeed;
  return `${sanitizeIdSegment(type)}-${sanitizeIdSegment(source)}`;
}

export function scopedId(instanceId: string, part: string): string {
  return `${instanceId}-${sanitizeIdSegment(part)}`;
}
