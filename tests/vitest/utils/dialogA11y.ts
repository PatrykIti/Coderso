import { expect } from "vitest";

export const getDialogTextByAttr = (
  dialog: Element,
  attr: "aria-labelledby" | "aria-describedby"
) => {
  const value = dialog.getAttribute(attr);
  expect(value, `Expected dialog to define ${attr}`).toBeTruthy();
  const ids = value?.split(/\s+/).filter(Boolean) ?? [];
  expect(ids.length, `Expected dialog ${attr} to reference at least one node`).toBeGreaterThan(0);
  const missingIds = ids.filter((id) => !document.getElementById(id));
  expect(missingIds, `Expected dialog ${attr} references to resolve`).toEqual([]);
  return ids
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const toConsoleMessages = (calls: unknown[][][]) =>
  calls.flat().map((args) => args.map((arg) => String(arg)).join(" "));

const isRadixDialogA11yWarning = (message: string) =>
  message.includes("DialogContent") &&
  (message.includes("DialogTitle") ||
    (message.includes("Missing") && message.includes("Description")));

export const expectNoRadixDialogA11yWarnings = (...callGroups: unknown[][][]) => {
  const messages = toConsoleMessages(callGroups);
  expect(messages.filter(isRadixDialogA11yWarning)).toEqual([]);
};
