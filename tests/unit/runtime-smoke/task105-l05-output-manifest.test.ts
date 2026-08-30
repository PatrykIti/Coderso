import {
  chmod,
  link,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
  archiveTask105L05Screenshots,
  assertExactTask105L05ScreenshotManifest,
  buildExactTask105L05ScreenshotManifest,
  verifyTask105L05ArchivedScreenshotsBeforeManifest,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/output-manifest";
import { TASK_105_L05_SCENARIO_DESCRIPTORS } from "../../../scripts/runtime-smoke/adapters/task-105-l05/descriptors";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";

const SESSION = "task105-fast-r1";

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ table![(value ^ byte) & 0xff]!;
  return (value ^ 0xffffffff) >>> 0;
}
const table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let v = i;
    for (let b = 0; b < 8; b += 1) v = (v & 1) === 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    t[i] = v >>> 0;
  }
  return t;
})();

/** Minimal valid grayscale PNG with correct CRCs and zlib data. */
function pngBytes(width = 2, height = 2, seed = 0): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const chunk = (type: string, data: Buffer): Buffer => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const rawRows = Buffer.alloc((width + 1) * height);
  for (let index = 0; index < rawRows.length; index += 1) {
    rawRows[index] = (index + seed) % 256;
  }
  // Every per-row filter byte must be a valid filter type.
  for (let row = 0; row < height; row += 1) {
    rawRows[row * (width + 1)] = 0;
  }
  const idat = deflateSync(rawRows);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function invocation(): Parameters<typeof buildExactTask105L05ScreenshotManifest>[0] {
  return {
    command: "run" as const,
    suite: "task-105-l05" as const,
    profile: "fast" as const,
    session: SESSION,
  };
}

describe("TASK-105 L05 screenshot manifest", () => {
  test("builds the exact five staging paths", () => {
    const manifest = buildExactTask105L05ScreenshotManifest(invocation());
    expect(manifest.entries.length).toBe(5);
    expect(manifest.paths.every((path) => path.endsWith(".png"))).toBe(true);
    expect(new Set(manifest.paths).size).toBe(5);
    expect(manifest.entries[0]?.scenarioId).toBe(TASK_105_L05_SCENARIO_DESCRIPTORS[0]?.id);
  });

  test("refuses wrong suite or bad session", () => {
    expect(() =>
      buildExactTask105L05ScreenshotManifest({ ...invocation(), suite: "task-547" })
    ).toThrow(SmokeError);
    expect(() =>
      buildExactTask105L05ScreenshotManifest({ ...invocation(), session: "BAD_SESSION" })
    ).toThrow(SmokeError);
  });

  test("manifest assertion rejects drifted rows", () => {
    const manifest = buildExactTask105L05ScreenshotManifest(invocation());
    const drifted = { ...manifest, entries: [...manifest.entries.slice(1), manifest.entries[0]!] };
    expect(() => assertExactTask105L05ScreenshotManifest(drifted)).toThrow();
  });
});

describe("TASK-105 L05 evidence archiving", () => {
  let root = "";
  let sessionDirectory = "";
  let archived: readonly { readonly path: string; readonly sha256: string }[] = [];

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "task105l05-manifest-"));
    sessionDirectory = join(root, "_docs/_workflows/_smoke/evidence/task-105", SESSION);
    await mkdir(sessionDirectory, { recursive: true });
    await chmod(sessionDirectory, 0o700);
    for (const descriptor of TASK_105_L05_SCENARIO_DESCRIPTORS) {
      const manifest = buildExactTask105L05ScreenshotManifest(invocation());
      const entry = manifest.entries.find((candidate) => candidate.scenarioId === descriptor.id)!;
      const staging = join(root, entry.path);
      await mkdir(join(staging, ".."), { recursive: true });
      await writeFile(
        staging,
        pngBytes(descriptor.viewport.width, descriptor.viewport.height, descriptor.number)
      );
    }
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("archives all five candidates exclusively and verifies hashes", async () => {
    const manifest = buildExactTask105L05ScreenshotManifest(invocation());
    const results = await archiveTask105L05Screenshots({
      root,
      manifest,
      evidenceSessionDirectory: sessionDirectory,
    });
    archived = results;
    expect(results.length).toBe(5);
    for (const result of results) {
      expect(result.path).toMatch(/^screenshots\/.+\.png$/u);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/u);
    }
  });

  test("refuses a pre-existing archived destination", async () => {
    const manifest = buildExactTask105L05ScreenshotManifest(invocation());
    await expect(
      archiveTask105L05Screenshots({ root, manifest, evidenceSessionDirectory: sessionDirectory })
    ).rejects.toThrow();
  });

  test("verifies exactly five archived screenshots before any manifest and rejects mode/hash/symlink/swaps", async () => {
    const manifest = buildExactTask105L05ScreenshotManifest(invocation());
    const report = { screenshots: archived };
    const screenshotsDirectory = join(sessionDirectory, "screenshots");
    const firstName = manifest.entries[0]!.path.split("/").at(-1)!;
    const firstPath = join(screenshotsDirectory, firstName);
    const original = await readFile(firstPath);
    const verify = (
      testSeams?: Parameters<
        typeof verifyTask105L05ArchivedScreenshotsBeforeManifest
      >[0]["testSeams"]
    ) =>
      verifyTask105L05ArchivedScreenshotsBeforeManifest({
        root,
        manifest,
        evidenceSessionDirectory: sessionDirectory,
        report,
        testSeams,
      });
    const expectManifestAbsent = async (): Promise<void> => {
      await expect(lstat(join(sessionDirectory, "manifest.json"))).rejects.toHaveProperty(
        "code",
        "ENOENT"
      );
    };

    await expect(verify()).resolves.toEqual(archived);
    await expectManifestAbsent();
    await expect(
      verifyTask105L05ArchivedScreenshotsBeforeManifest({
        repoRoot: root,
        expectedTask: "TASK-105",
        expectedSession: SESSION,
        expectedManifest: manifest,
        report,
      })
    ).resolves.toEqual(archived);
    await expect(
      verifyTask105L05ArchivedScreenshotsBeforeManifest({
        repoRoot: root,
        expectedTask: "TASK-540" as never,
        expectedSession: SESSION,
        expectedManifest: manifest,
        report,
      })
    ).rejects.toThrow(SmokeError);
    await expectManifestAbsent();

    const screenshotsBackup = join(sessionDirectory, "screenshots-backup");
    await rename(screenshotsDirectory, screenshotsBackup);
    await symlink(screenshotsBackup, screenshotsDirectory);
    await expect(verify()).rejects.toThrow(SmokeError);
    await expectManifestAbsent();
    await rm(screenshotsDirectory);
    await rename(screenshotsBackup, screenshotsDirectory);

    await chmod(firstPath, 0o644);
    await expect(verify()).rejects.toThrow(SmokeError);
    await expectManifestAbsent();
    await chmod(firstPath, 0o600);

    await writeFile(
      firstPath,
      pngBytes(manifest.entries[0]!.width, manifest.entries[0]!.height, 99),
      { mode: 0o600 }
    );
    await expect(verify()).rejects.toThrow(SmokeError);
    await expectManifestAbsent();
    await writeFile(firstPath, original, { mode: 0o600 });

    await rm(firstPath);
    await symlink(join(root, "real.png"), firstPath);
    await expect(verify()).rejects.toThrow(SmokeError);
    await expectManifestAbsent();
    await rm(firstPath);
    await writeFile(firstPath, original, { mode: 0o600 });

    const replacement = join(root, "replacement.png");
    await writeFile(replacement, original, { mode: 0o600 });
    await expect(
      verify({
        afterNoFollowOpen: async (path) => {
          if (path === firstPath) await rename(replacement, firstPath);
        },
      })
    ).rejects.toThrow(SmokeError);
    await expectManifestAbsent();

    const directoryReplacement = join(sessionDirectory, "screenshots-replacement");
    const directoryOriginal = join(sessionDirectory, "screenshots-original");
    await mkdir(directoryReplacement, { mode: 0o700 });
    await expect(
      verify({
        afterDirectoryRead: async (path) => {
          if (path === screenshotsDirectory) {
            await rename(screenshotsDirectory, directoryOriginal);
            await rename(directoryReplacement, screenshotsDirectory);
          }
        },
      })
    ).rejects.toThrow(SmokeError);
    await expectManifestAbsent();
  });

  test("refuses a symlinked candidate", async () => {
    const otherRoot = await mkdtemp(join(tmpdir(), "task105l05-symlink-"));
    try {
      const sessionDir = join(otherRoot, "_docs/_workflows/_smoke/evidence/task-105", SESSION);
      await mkdir(sessionDir, { recursive: true });
      await chmod(sessionDir, 0o700);
      const manifest = buildExactTask105L05ScreenshotManifest(invocation());
      const first = manifest.entries[0]!;
      const realFile = join(otherRoot, "real.png");
      await writeFile(realFile, pngBytes());
      const staging = join(otherRoot, first.path);
      await mkdir(join(staging, ".."), { recursive: true });
      await symlink(realFile, staging);
      await expect(
        archiveTask105L05Screenshots({
          root: otherRoot,
          manifest,
          evidenceSessionDirectory: sessionDir,
        })
      ).rejects.toThrow();
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  test("refuses a hard-linked candidate before any archive write", async () => {
    const otherRoot = await mkdtemp(join(tmpdir(), "task105l05-hard-link-"));
    try {
      const sessionDir = join(otherRoot, "_docs/_workflows/_smoke/evidence/task-105", SESSION);
      await mkdir(sessionDir, { recursive: true });
      await chmod(sessionDir, 0o700);
      const manifest = buildExactTask105L05ScreenshotManifest(invocation());
      const first = manifest.entries[0]!;
      const realFile = join(otherRoot, "real.png");
      await writeFile(realFile, pngBytes(first.width, first.height));
      const staging = join(otherRoot, first.path);
      await mkdir(join(staging, ".."), { recursive: true });
      await link(realFile, staging);
      await expect(
        archiveTask105L05Screenshots({
          root: otherRoot,
          manifest,
          evidenceSessionDirectory: sessionDir,
        })
      ).rejects.toThrow(SmokeError);
      await expect(
        lstat(join(sessionDir, "screenshots", first.path.split("/").at(-1)!))
      ).rejects.toHaveProperty("code", "ENOENT");
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  test("refuses a symlinked archive destination", async () => {
    const otherRoot = await mkdtemp(join(tmpdir(), "task105l05-destination-link-"));
    try {
      const sessionDir = join(otherRoot, "_docs/_workflows/_smoke/evidence/task-105", SESSION);
      await mkdir(sessionDir, { recursive: true });
      await chmod(sessionDir, 0o700);
      const manifest = buildExactTask105L05ScreenshotManifest(invocation());
      const first = manifest.entries[0]!;
      const staging = join(otherRoot, first.path);
      await mkdir(join(staging, ".."), { recursive: true });
      await writeFile(staging, pngBytes(first.width, first.height));
      const destinationDirectory = join(sessionDir, "screenshots");
      await mkdir(destinationDirectory, { mode: 0o700 });
      await symlink(
        join(otherRoot, "missing-target.png"),
        join(destinationDirectory, first.path.split("/").at(-1)!)
      );
      await expect(
        archiveTask105L05Screenshots({
          root: otherRoot,
          manifest,
          evidenceSessionDirectory: sessionDir,
        })
      ).rejects.toThrow(SmokeError);
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });
});
