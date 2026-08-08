import { expect, test } from "bun:test";
import { deflateSync } from "node:zlib";

import {
  assertExactTask547ScreenshotManifest,
  buildExactTask547ScreenshotManifest,
  decodeTask547Png,
} from "../../../scripts/runtime-smoke/adapters/task-547/output-manifest";

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.byteLength);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([size, typeBytes, data, checksum]);
}

function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("TASK-547 manifest owns exactly 18 screenshot-only deterministic paths", () => {
  const manifest = buildExactTask547ScreenshotManifest({
    command: "run",
    suite: "task-547",
    profile: "fast",
    session: "wf547-manifest",
  });
  assertExactTask547ScreenshotManifest(manifest);
  expect(manifest.entries).toHaveLength(18);
  expect(new Set(manifest.paths).size).toBe(18);
  expect(manifest.paths.every((path) => path.endsWith(".png") && !path.endsWith(".json"))).toBe(
    true
  );
  expect(manifest.paths[0]).toBe(
    "_docs/_workflows/_smoke/task-547/screenshots/fast-wf547-manifest-01-home-desktop-effects.png"
  );
});

test("TASK-547 PNG evidence decoder verifies structure, dimensions, and checksums", () => {
  const bytes = png(3, 2);
  expect(decodeTask547Png(bytes)).toMatchObject({ width: 3, height: 2, bytes: bytes.length });
  const corrupted = Buffer.from(bytes);
  corrupted[corrupted.length - 5] ^= 1;
  expect(() => decodeTask547Png(corrupted)).toThrow("checksum");
});
