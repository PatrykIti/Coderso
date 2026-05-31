import { expect, test } from "vitest";

import { resolveDevCssUrl, resolveSiteDevServerUrl } from "../../../core/server/utils/styleUrl";

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

test("resolveSiteDevServerUrl prefers explicit site url", () => {
  const href = resolveSiteDevServerUrl(
    "http://localhost:6000/site/",
    "http://localhost:5173/admin/"
  );
  expect(href).toBe("http://localhost:6000/");
});

test("resolveSiteDevServerUrl derives the sibling site vite url from admin dev url", () => {
  const href = resolveSiteDevServerUrl(undefined, "http://127.0.0.1:5173/admin/");
  expect(href).toBe("http://127.0.0.1:5174/");
});
