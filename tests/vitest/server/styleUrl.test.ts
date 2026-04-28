import { expect, test } from "vitest";

import { resolveDevCssUrl } from "../../../core/server/utils/styleUrl";

test("resolveDevCssUrl joins base url and css path", () => {
  const href = resolveDevCssUrl("http://localhost:5174", "/styles/site.css");
  expect(href).toBe("http://localhost:5174/styles/site.css");
});

test("resolveDevCssUrl handles trailing slash in base url", () => {
  const href = resolveDevCssUrl("http://localhost:5173/", "/styles/globals.css");
  expect(href).toBe("http://localhost:5173/styles/globals.css");
});

test("resolveDevCssUrl returns null for invalid url", () => {
  const href = resolveDevCssUrl("://bad-url", "/styles/site.css");
  expect(href).toBeNull();
});
