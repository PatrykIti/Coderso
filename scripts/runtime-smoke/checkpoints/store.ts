import { randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, readdir, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { SmokeError, resolveInsideRoot } from "../contracts";
import type {
  CheckpointIdentity,
  ScenarioCheckpoint,
  ScenarioCheckpointContract,
} from "./contracts";
import { MAX_CHECKPOINT_BYTES, validateScenarioCheckpoint } from "./contracts";
import { assertCheckpointCompatible, encodeCheckpoint } from "./digests";

const FILE = /^(?<ordinal>[1-9][0-9]{0,3})-(?<scenario>[a-z0-9][a-z0-9._-]{0,63})\.json$/u;

export class CheckpointStore {
  readonly #directory: string;

  constructor(root: string, relativeDirectory = ".tmp/runtime-smoke/checkpoints") {
    this.#directory = resolveInsideRoot(root, relativeDirectory, "checkpoint directory");
  }

  async save(checkpointInput: ScenarioCheckpoint): Promise<void> {
    const checkpoint = validateScenarioCheckpoint(checkpointInput);
    await mkdir(this.#directory, { recursive: true, mode: 0o700 });
    const directoryInfo = await lstat(this.#directory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
      throw new SmokeError("smoke_output_invalid", "checkpoint directory identity is invalid");
    }
    const bytes = Buffer.from(encodeCheckpoint(checkpoint));
    if (bytes.byteLength > MAX_CHECKPOINT_BYTES) {
      throw new SmokeError("smoke_output_invalid", "checkpoint exceeds its byte bound");
    }
    const name = `${checkpoint.ordinal}-${checkpoint.scenarioId}.json`;
    const destination = resolveInsideRoot(this.#directory, name, "checkpoint path");
    const temporary = resolveInsideRoot(
      this.#directory,
      `.${basename(name)}.${randomUUID()}.tmp`,
      "checkpoint temporary path"
    );
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await link(temporary, destination);
      await unlink(temporary);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw new SmokeError("smoke_output_invalid", "checkpoint atomic write failed", {
        cause: error,
      });
    }
  }

  async loadLatestCompatible(
    identity: CheckpointIdentity,
    contracts: readonly ScenarioCheckpointContract[]
  ): Promise<ScenarioCheckpoint | null> {
    const names = await readdir(this.#directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    if (names.length > 64 || names.some((name) => !FILE.test(name))) {
      throw new SmokeError("smoke_output_invalid", "checkpoint directory contains invalid files");
    }
    const ordered = names.sort((left, right) => {
      const leftOrdinal = Number(FILE.exec(left)?.groups?.ordinal ?? 0);
      const rightOrdinal = Number(FILE.exec(right)?.groups?.ordinal ?? 0);
      return rightOrdinal - leftOrdinal || right.localeCompare(left);
    });
    if (ordered.length === 0) return null;
    const selected = resolveInsideRoot(this.#directory, ordered[0]!, "checkpoint path");
    const info = await lstat(selected);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.size <= 0 ||
      info.size > MAX_CHECKPOINT_BYTES
    ) {
      throw new SmokeError("smoke_output_invalid", "checkpoint file identity is invalid");
    }
    const bytes = await readFile(selected);
    if (bytes.at(-1) !== 10 || bytes.includes(0)) {
      throw new SmokeError("smoke_output_invalid", "checkpoint file framing is invalid");
    }
    let value: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.slice(0, -1).includes("\n") || text.includes("\r")) throw new Error("framing");
      value = JSON.parse(text.slice(0, -1));
    } catch (error) {
      throw new SmokeError("smoke_output_invalid", "checkpoint file is malformed", {
        cause: error,
      });
    }
    return assertCheckpointCompatible(validateScenarioCheckpoint(value), identity, contracts);
  }
}
