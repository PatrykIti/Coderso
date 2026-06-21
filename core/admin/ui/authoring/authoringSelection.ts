export type AuthoringSelectionTarget =
  | { kind: "section"; id: string }
  | { kind: "block"; sectionId: string; id: string };

export const isAuthoringSectionSelection = (
  target: AuthoringSelectionTarget | null | undefined
): target is Extract<AuthoringSelectionTarget, { kind: "section" }> => target?.kind === "section";

export const isAuthoringBlockSelection = (
  target: AuthoringSelectionTarget | null | undefined
): target is Extract<AuthoringSelectionTarget, { kind: "block" }> => target?.kind === "block";

export const isSameAuthoringSelection = (
  left: AuthoringSelectionTarget | null | undefined,
  right: AuthoringSelectionTarget | null | undefined
) => {
  if (!left || !right) return left === right;
  if (left.kind !== right.kind || left.id !== right.id) return false;
  if (left.kind === "section") return true;
  return right.kind === "block" && left.sectionId === right.sectionId;
};
