/**
 * Bounded, deterministic source-file scanning for the inventory walker.
 *
 * Reads may finish in any order, but results and failures are resolved by the
 * canonical source-file index. That keeps concurrent I/O from changing either
 * emitted ordering or the fail-closed error selected for a source tree.
 */
import { InventoryError, fail } from "./contracts";
import type { InventoryScanIo } from "./fileDiscovery";

const MAX_INDEXED_SOURCE_READ_CONCURRENCY = 64;

export type IndexedSourceScanInput<T> = Readonly<{
  files: readonly string[];
  io: InventoryScanIo;
  readConcurrency: number;
  scanSource: (file: string, text: string) => readonly T[];
}>;

export async function scanIndexedSourcesOrThrow<T>(
  input: IndexedSourceScanInput<T>
): Promise<readonly T[]> {
  if (
    !Number.isSafeInteger(input.readConcurrency) ||
    input.readConcurrency < 1 ||
    input.readConcurrency > MAX_INDEXED_SOURCE_READ_CONCURRENCY
  ) {
    fail("query_inventory_scan_invalid", "read-concurrency");
  }
  if (input.files.length === 0) return Object.freeze([]);
  const results: Array<readonly T[] | undefined> = new Array(input.files.length);
  const failures: unknown[] = new Array(input.files.length);
  let nextIndex = 0;
  const scanNext = async (): Promise<void> => {
    while (nextIndex < input.files.length) {
      const index = nextIndex;
      nextIndex += 1;
      const file = input.files[index]!;
      try {
        results[index] = input.scanSource(file, await input.io.readUtf8(file));
      } catch (error) {
        failures[index] = error;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(input.readConcurrency, input.files.length) }, () => scanNext())
  );
  for (const failure of failures) {
    if (failure === undefined) continue;
    if (failure instanceof InventoryError) throw failure;
    fail("query_inventory_scan_invalid", "source-file");
  }
  const discovered: T[] = [];
  for (const fileResults of results) {
    if (fileResults === undefined) fail("query_inventory_scan_invalid", "source-file");
    discovered.push(...fileResults);
  }
  return Object.freeze(discovered);
}
