import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, chmod, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

import {
  TASK_105_L08_STAGING_ROOT,
  archiveTask105L08Screenshots,
  assertExactTask105L08ScreenshotManifest,
  buildExactTask105L08ScreenshotManifest,
  task105L08StagingPath,
  verifyTask105L08ArchivedScreenshots,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08/output-manifest";
import { TASK_105_L08_SCENARIO_DESCRIPTORS } from "../../../scripts/runtime-smoke/adapters/task-105-l08/descriptors";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";

const INPUT = {
  command: "run" as const,
  suite: "task-105-l08" as const,
  profile: "fast" as const,
  session: "task105l08-fast",
};

/** Minimal deterministic PNG bytes accepted by the shared 547 decoder. */
function pngBytes(width: number, height: number, seed = 0): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const table = (() => {
      const crc: number[] = [];
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc[n] = c >>> 0;
      }
      return crc;
    })();
    const crcTable = (value: Buffer): number => {
      let crc = 0xffffffff;
      for (const byte of value) crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcTable(body), 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let row = 0; row < height; row += 1) {
    const stride = row * (1 + width * 3);
    raw[stride] = 0;
    // The leading pixel carries the seed so each candidate has a distinct
    // digest; the archive gate rejects duplicate screenshot content.
    raw[stride + 1] = seed % 256;
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function evidencePath(root: string): string {
  return join(root, "_docs/_workflows/_smoke/evidence/task-105", INPUT.session);
}

async function seedSession(root: string): Promise<string> {
  const session = evidencePath(root);
  await mkdir(session, { recursive: true, mode: 0o700 });
  await writeFile(join(session, "report.json"), "{}\n", { mode: 0o600 });
  return session;
}

async function seedCandidates(root: string): Promise<void> {
  const staging = join(root, TASK_105_L08_STAGING_ROOT);
  await mkdir(staging, { recursive: true, mode: 0o700 });
  for (const descriptor of TASK_105_L08_SCENARIO_DESCRIPTORS) {
    await writeFile(
      join(root, task105L08StagingPath(INPUT, descriptor)),
      pngBytes(descriptor.viewport.width, descriptor.viewport.height, descriptor.number),
      { mode: 0o600 }
    );
  }
}

describe("TASK-105 L08 output manifest", () => {
  test("declares exactly five stable, dimensioned PNG paths", () => {
    const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
    expect(manifest.entries.length).toBe(5);
    expect(manifest.paths.length).toBe(5);
    expect(new Set(manifest.paths).size).toBe(5);
    expect(manifest.entries.map((entry) => entry.scenarioId)).toEqual(
      TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor) => descriptor.id)
    );
    expect(
      manifest.entries.every((entry) => entry.path.startsWith(`${TASK_105_L08_STAGING_ROOT}/`))
    ).toBe(true);
    expect(manifest.entries.every((entry) => entry.width === 1440 && entry.height === 900)).toBe(
      true
    );
    expect(() => assertExactTask105L08ScreenshotManifest(manifest)).not.toThrow();
    expect(() =>
      buildExactTask105L08ScreenshotManifest({ ...INPUT, suite: "task-105-l05" })
    ).toThrow(SmokeError);
    expect(() =>
      buildExactTask105L08ScreenshotManifest({ ...INPUT, session: "bad_session" })
    ).toThrow(SmokeError);
    const drifted = buildExactTask105L08ScreenshotManifest(INPUT);
    const [first] = drifted.entries;
    expect(first).toBeDefined();
    const broken = {
      ...drifted,
      entries: [{ ...first, path: "screenshots/other.png" }],
      paths: ["screenshots/other.png"],
    };
    expect(() => assertExactTask105L08ScreenshotManifest(broken as never)).toThrow();
  });

  test("archives exactly five exclusive 0600 PNGs into the session", async () => {
    const root = await mkdtemp(join(tmpdir(), "l08-manifest-"));
    try {
      const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
      const session = await seedSession(root);
      await seedCandidates(root);
      const archived = await archiveTask105L08Screenshots({
        root,
        manifest,
        evidenceSessionDirectory: session,
      });
      expect(archived.length).toBe(5);
      expect(new Set(archived.map(({ sha256 }) => sha256)).size).toBe(5);
      expect(archived.every(({ path }) => path.startsWith("screenshots/"))).toBe(true);
      const verified = await verifyTask105L08ArchivedScreenshots({
        root,
        manifest,
        evidenceSessionDirectory: session,
      });
      expect(verified).toEqual(archived);
      // Existing evidence is never replaced.
      await expect(
        archiveTask105L08Screenshots({
          root,
          manifest,
          evidenceSessionDirectory: session,
        })
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("fails closed on symlinked, wrong-dimension, or duplicate candidates", async () => {
    const root = await mkdtemp(join(tmpdir(), "l08-manifest-"));
    try {
      const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
      const session = await seedSession(root);
      const staging = join(root, TASK_105_L08_STAGING_ROOT);
      await mkdir(staging, { recursive: true, mode: 0o700 });
      const [first, ...rest] = TASK_105_L08_SCENARIO_DESCRIPTORS;
      if (first === undefined || rest.length !== 4) throw new Error("descriptor list drifted");
      await writeFile(join(root, task105L08StagingPath(INPUT, first)), pngBytes(1, 1), {
        mode: 0o600,
      });
      for (const descriptor of rest) {
        await writeFile(
          join(root, task105L08StagingPath(INPUT, descriptor)),
          pngBytes(descriptor.viewport.width, descriptor.viewport.height),
          { mode: 0o600 }
        );
      }
      await expect(
        archiveTask105L08Screenshots({ root, manifest, evidenceSessionDirectory: session })
      ).rejects.toThrow();

      // Symlinked candidate is rejected by the no-follow read.
      const root2 = await mkdtemp(join(tmpdir(), "l08-manifest-"));
      try {
        const session2 = await seedSession(root2);
        const staging2 = join(root2, TASK_105_L08_STAGING_ROOT);
        await mkdir(staging2, { recursive: true, mode: 0o700 });
        const target = join(root2, "payload.png");
        await writeFile(target, pngBytes(first.viewport.width, first.viewport.height), {
          mode: 0o600,
        });
        await symlink(target, join(root2, task105L08StagingPath(INPUT, first)));
        for (const descriptor of rest) {
          await writeFile(
            join(root2, task105L08StagingPath(INPUT, descriptor)),
            pngBytes(descriptor.viewport.width, descriptor.viewport.height),
            { mode: 0o600 }
          );
        }
        await expect(
          archiveTask105L08Screenshots({
            root: root2,
            manifest,
            evidenceSessionDirectory: session2,
          })
        ).rejects.toThrow();
      } finally {
        await rm(root2, { recursive: true, force: true });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("requires the canonical evidence session and a 0700 screenshots dir", async () => {
    const root = await mkdtemp(join(tmpdir(), "l08-manifest-"));
    try {
      const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
      const session = await seedSession(root);
      await seedCandidates(root);
      await expect(
        archiveTask105L08Screenshots({
          root,
          manifest,
          evidenceSessionDirectory: join(root, "elsewhere"),
        })
      ).rejects.toThrow();
      await archiveTask105L08Screenshots({ root, manifest, evidenceSessionDirectory: session });
      const loose = join(session, "screenshots");
      await chmod(loose, 0o755);
      await expect(
        verifyTask105L08ArchivedScreenshots({
          root,
          manifest,
          evidenceSessionDirectory: session,
        })
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("race seam runs during the no-follow read window", async () => {
    const root = await mkdtemp(join(tmpdir(), "l08-manifest-"));
    try {
      const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
      const session = await seedSession(root);
      await seedCandidates(root);
      const observed: string[] = [];
      const archived = await archiveTask105L08Screenshots({
        root,
        manifest,
        evidenceSessionDirectory: session,
        testSeams: {
          afterNoFollowOpen: (path) => {
            observed.push(path.split("/").at(-1) ?? "");
          },
        },
      });
      expect(observed.length).toBe(10);
      expect(archived.length).toBe(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
