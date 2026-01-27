import { expect, test } from "bun:test";
import { resolveUpdatePolicy, shouldAutoUpdate } from "../../../core/store/updater";

test("resolveUpdatePolicy defaults to auto-security", () => {
  expect(resolveUpdatePolicy(undefined)).toBe("auto-security");
  expect(resolveUpdatePolicy("manual")).toBe("manual");
  expect(resolveUpdatePolicy("auto-all")).toBe("auto-all");
  expect(resolveUpdatePolicy("unknown")).toBe("auto-security");
});

test("auto-security only allows security releases", () => {
  expect(shouldAutoUpdate("auto-security", { type: "security" }).allowed).toBe(true);
  expect(shouldAutoUpdate("auto-security", { type: "normal" }).allowed).toBe(false);
});

test("manual policy blocks auto updates", () => {
  expect(shouldAutoUpdate("manual", { type: "security" }).allowed).toBe(false);
});
