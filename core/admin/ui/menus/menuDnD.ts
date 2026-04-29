export type MenuDropIntent = "before" | "after" | "child";

export function resolveMenuDropIntent(input: {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top" | "height">;
  indentThresholdPx?: number;
}): MenuDropIntent {
  const threshold = input.indentThresholdPx ?? 36;
  const offsetX = input.clientX - input.rect.left;
  const offsetY = input.clientY - input.rect.top;
  const topZone = input.rect.height * 0.25;
  const bottomZone = input.rect.height * 0.75;

  if (offsetY < topZone) return "before";
  if (offsetY > bottomZone) return "after";
  if (offsetX > threshold) return "child";
  return "child";
}
