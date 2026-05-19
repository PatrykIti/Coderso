import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

const siteCss = readFileSync(path.join(process.cwd(), "core/site/styles/site.css"), "utf8");
const adminCss = readFileSync(path.join(process.cwd(), "core/admin/styles/globals.css"), "utf8");

test("logo cloud marquee styles stay aligned between public runtime and admin preview", () => {
  for (const css of [siteCss, adminCss]) {
    expect(css).toContain("@keyframes logo-cloud-marquee");
    expect(css).toContain(".logo-cloud-marquee-track");
    expect(css).toContain("animation-play-state: paused;");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  }
});
