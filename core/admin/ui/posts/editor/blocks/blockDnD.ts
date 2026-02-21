type ItemWithId = {
  id: string;
};

export const clampDropIndex = (value: number, length: number) => {
  if (!Number.isFinite(value)) return 0;
  if (length <= 0) return 0;
  if (value < 0) return 0;
  if (value > length) return length;
  return Math.round(value);
};

export const resolveDropIndexFromPointer = (
  targetIndex: number,
  pointerClientY: number,
  rect: { top: number; height: number }
) => {
  if (!Number.isFinite(pointerClientY) || !Number.isFinite(rect.height) || rect.height <= 0) {
    return targetIndex;
  }
  const midpoint = rect.top + rect.height / 2;
  return pointerClientY > midpoint ? targetIndex + 1 : targetIndex;
};

export const reorderItemsById = <T extends ItemWithId>(
  items: T[],
  itemId: string,
  targetIndex: number
) => {
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  if (sourceIndex === -1) return items;

  const boundedTarget = clampDropIndex(targetIndex, items.length);
  if (boundedTarget === sourceIndex || boundedTarget === sourceIndex + 1) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) return items;

  const insertIndex = sourceIndex < boundedTarget ? boundedTarget - 1 : boundedTarget;
  next.splice(insertIndex, 0, moved);
  return next;
};
