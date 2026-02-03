export type WidgetBlockOption = { id: string; label: string };

type BlockLike = { id?: unknown; type?: unknown };

export const mapWidgetBlockOptions = (
  blocks: unknown[],
  resolveLabel: (type: string) => string
): WidgetBlockOption[] => {
  if (!Array.isArray(blocks)) return [];
  const options: WidgetBlockOption[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const record = block as BlockLike;
    if (typeof record.id !== "string" || typeof record.type !== "string") continue;
    const id = record.id.trim();
    const type = record.type.trim();
    if (!id || !type) continue;
    options.push({ id, label: resolveLabel(type) });
  }
  return options;
};
