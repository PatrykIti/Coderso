export type MediaPickerSelectionValue = string | string[] | null;
export type MediaPickerValue = MediaPickerSelectionValue | undefined;

export const normalizeMediaPickerValue = (value: unknown, multiple: boolean): MediaPickerValue => {
  if (multiple) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? value : null;
};
