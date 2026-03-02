import { useEffect } from "react";

type ShortcutCombo = {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type PostEditorShortcutId =
  | "toggleInserter"
  | "toggleOutline"
  | "toggleDetails"
  | "closePanels";

export const POST_EDITOR_SHORTCUTS: Record<
  PostEditorShortcutId,
  { id: PostEditorShortcutId; label: string; combo: ShortcutCombo }
> = {
  toggleInserter: {
    id: "toggleInserter",
    label: "Toggle block inserter",
    combo: { key: "i", mod: true, shift: true },
  },
  toggleOutline: {
    id: "toggleOutline",
    label: "Toggle document overview",
    combo: { key: "o", mod: true, shift: true },
  },
  toggleDetails: {
    id: "toggleDetails",
    label: "Toggle post details",
    combo: { key: "d", mod: true, shift: true },
  },
  closePanels: {
    id: "closePanels",
    label: "Close open panels",
    combo: { key: "escape" },
  },
};

const formatComboLabel = (combo: ShortcutCombo) => {
  const parts: string[] = [];
  if (combo.mod) parts.push("Mod");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join("+");
};

const formatComboAria = (combo: ShortcutCombo, modKey?: "Control" | "Meta") => {
  const parts: string[] = [];
  if (combo.mod && modKey) parts.push(modKey);
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join("+");
};

export const formatPostEditorShortcutLabel = (id: PostEditorShortcutId) =>
  formatComboLabel(POST_EDITOR_SHORTCUTS[id].combo);

export const formatPostEditorShortcutAria = (id: PostEditorShortcutId) => {
  const combo = POST_EDITOR_SHORTCUTS[id].combo;
  if (combo.mod) {
    return `${formatComboAria(combo, "Control")} ${formatComboAria(combo, "Meta")}`;
  }
  return formatComboAria(combo);
};

type PostEditorShortcutHandlers = {
  onToggleInserter?: () => void;
  onToggleOutline?: () => void;
  onToggleDetails?: () => void;
  onEscape?: () => void;
};

type UsePostEditorShortcutsOptions = {
  enabled?: boolean;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
};

const matchesCombo = (event: KeyboardEvent, combo: ShortcutCombo) => {
  const key = event.key.toLowerCase();
  if (combo.key === "escape") return key === "escape";
  if (combo.key.toLowerCase() !== key) return false;
  const isModPressed = event.metaKey || event.ctrlKey;
  if (combo.mod && !isModPressed) return false;
  if (!combo.mod && isModPressed) return false;
  if (combo.shift && !event.shiftKey) return false;
  if (!combo.shift && event.shiftKey) return false;
  if (combo.alt && !event.altKey) return false;
  if (!combo.alt && event.altKey) return false;
  return true;
};

export function usePostEditorShortcuts(
  handlers: PostEditorShortcutHandlers,
  options: UsePostEditorShortcutsOptions = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (matchesCombo(event, POST_EDITOR_SHORTCUTS.closePanels.combo)) {
        handlers.onEscape?.();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (matchesCombo(event, POST_EDITOR_SHORTCUTS.toggleInserter.combo)) {
        event.preventDefault();
        handlers.onToggleInserter?.();
        return;
      }
      if (matchesCombo(event, POST_EDITOR_SHORTCUTS.toggleOutline.combo)) {
        event.preventDefault();
        handlers.onToggleOutline?.();
        return;
      }
      if (matchesCombo(event, POST_EDITOR_SHORTCUTS.toggleDetails.combo)) {
        event.preventDefault();
        handlers.onToggleDetails?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handlers]);
}
