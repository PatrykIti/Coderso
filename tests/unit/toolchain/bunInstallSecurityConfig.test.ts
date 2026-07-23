import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");
const MINIMUM_RELEASE_AGE_SECONDS = 7 * 24 * 60 * 60;

test("Bun install configuration enforces hoisting and a seven-day release age", () => {
  const bunfig = readFileSync(path.join(root, "bunfig.toml"), "utf-8");
  const sectionPattern = /^\s*\[([^\]]+)]\s*(?:#.*)?$/gm;
  const sections = [...bunfig.matchAll(sectionPattern)];
  const installSections = sections.filter((section) => section[1] === "install");

  expect(installSections).toHaveLength(1);

  const installSection = installSections[0];
  const sectionStart = (installSection.index ?? 0) + installSection[0].length;
  const nextSection = sections.find((section) => (section.index ?? 0) > sectionStart);
  const sectionEnd = nextSection?.index ?? bunfig.length;
  const installBody = bunfig.slice(sectionStart, sectionEnd);
  const linkers = [...installBody.matchAll(/^\s*linker\s*=\s*"([^"]+)"\s*(?:#.*)?$/gm)];
  const releaseAges = [...installBody.matchAll(/^\s*minimumReleaseAge\s*=\s*(\d+)\s*(?:#.*)?$/gm)];

  expect(linkers.map((match) => match[1])).toEqual(["hoisted"]);
  expect(releaseAges).toHaveLength(1);
  expect(Number(releaseAges[0][1])).toBe(MINIMUM_RELEASE_AGE_SECONDS);
});
