/**
 * Deterministic, source-only discovery of production TypeScript files.
 *
 * This module owns filesystem traversal so scanner analysis remains focused on
 * AST classification. Its injected I/O seam keeps every failure path DB-free.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

import { fail, isCanonicalCoreSourceFile } from "./contracts";

export type InventoryDirectoryEntry = Readonly<{
  name: string;
  kind: "file" | "directory" | "symlink" | "other";
}>;
export type InventoryScanIo = Readonly<{
  readDirectory: (relativeDirectory: string) => Promise<readonly InventoryDirectoryEntry[]>;
  readUtf8: (relativeFile: string) => Promise<string>;
}>;

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const DEFAULT_ROOT = path.resolve(import.meta.dir, "../..");

export function createNodeScanIo(root = DEFAULT_ROOT): InventoryScanIo {
  return {
    async readDirectory(relativeDirectory) {
      let entries: readonly Dirent[];
      try {
        entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
      } catch {
        fail("query_inventory_scan_invalid", "directory");
      }
      return entries.map((entry) => ({
        name: entry.name,
        kind: entry.isSymbolicLink()
          ? "symlink"
          : entry.isDirectory()
            ? "directory"
            : entry.isFile()
              ? "file"
              : "other",
      }));
    },
    async readUtf8(relativeFile) {
      try {
        return await readFile(path.join(root, relativeFile), "utf8");
      } catch {
        return fail("query_inventory_scan_invalid", "source-file");
      }
    },
  };
}

function isTestFile(relativeFile: string): boolean {
  return /\.(?:test|spec)\.(?:ts|tsx|mts|cts)$/.test(relativeFile);
}

function isExcludedDirectory(relativeDirectory: string): boolean {
  return relativeDirectory === "core/db/migrations";
}

function extensionOf(relativeFile: string): string {
  const match = /\.(?:ts|tsx|mts|cts)$/.exec(relativeFile);
  return match?.[0] ?? "";
}

export async function listCanonicalCoreFilesOrThrow(
  input: { root?: "core"; io?: InventoryScanIo } = {}
): Promise<readonly string[]> {
  const root = input.root ?? "core";
  if (root !== "core") fail("query_inventory_scan_invalid", "root");
  const io = input.io ?? createNodeScanIo();
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = [...(await io.readDirectory(directory))].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    for (const entry of entries) {
      if (
        entry.name.length === 0 ||
        entry.name === "." ||
        entry.name === ".." ||
        !/^[A-Za-z0-9_.@+-]+$/.test(entry.name)
      ) {
        fail("query_inventory_scan_invalid", "directory-entry");
      }
      const child = `${directory}/${entry.name}`;
      if (entry.kind === "symlink") fail("query_inventory_scan_invalid", "symlink");
      if (entry.kind === "directory") {
        if (!isExcludedDirectory(child)) await visit(child);
        continue;
      }
      if (entry.kind !== "file") fail("query_inventory_scan_invalid", "source-form");
      if (SOURCE_EXTENSIONS.has(extensionOf(child)) && !isTestFile(child)) {
        if (!isCanonicalCoreSourceFile(child)) fail("query_inventory_scan_invalid", "source-file");
        files.push(child);
      }
    }
  };
  await visit(root);
  return Object.freeze(files.sort());
}
