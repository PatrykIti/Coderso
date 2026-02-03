export type WidgetBlockOption = {
  id: string;
  label: string;
  type: string;
  depth: number;
  supportsChildren: boolean;
};

type BlockLike = { id?: unknown; type?: unknown; children?: unknown };

export const mapWidgetBlockOptions = (
  blocks: unknown[],
  resolveLabel: (type: string) => string,
  resolveChildrenSupport: (type: string) => boolean,
  depth = 0
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
    const prefix = depth > 0 ? `${"-- ".repeat(depth)}` : "";
    options.push({
      id,
      type,
      depth,
      supportsChildren: resolveChildrenSupport(type),
      label: `${prefix}${resolveLabel(type)}`,
    });
    if (Array.isArray(record.children) && record.children.length > 0) {
      options.push(
        ...mapWidgetBlockOptions(
          record.children,
          resolveLabel,
          resolveChildrenSupport,
          depth + 1
        )
      );
    }
  }
  return options;
};
