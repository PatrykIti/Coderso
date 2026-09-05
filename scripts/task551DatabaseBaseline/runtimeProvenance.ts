import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { existsSync, readFileSync } from "node:fs";

function invalid(): never {
  throw new Error("database_baseline_invalid");
}

export type Task551RuntimeProvenance = Readonly<{
  provenanceCommit: string;
  platform: string;
  arch: string;
  cpuModel: string;
  logicalCpus: number;
  memoryMb: number;
  containerMode: "container" | "host";
}>;

function readProvenanceCommit(): string {
  try {
    const commit = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!/^[0-9a-f]{40,64}$/u.test(commit)) invalid();
    return commit;
  } catch {
    invalid();
  }
}

function readContainerMode(): "container" | "host" {
  if (existsSync("/.dockerenv")) return "container";
  try {
    const cgroup = readFileSync("/proc/1/cgroup", "utf8");
    return /docker|kubepods|containerd|podman/iu.test(cgroup) ? "container" : "host";
  } catch {
    return "host";
  }
}

export function readTask551RuntimeProvenance(): Task551RuntimeProvenance {
  const model = cpus()[0]?.model;
  if (typeof model !== "string" || model.length === 0) invalid();
  return {
    provenanceCommit: readProvenanceCommit(),
    platform: process.platform,
    arch: process.arch,
    cpuModel: `sha256:${createHash("sha256").update(model, "utf8").digest("hex")}`,
    logicalCpus: Math.max(1, cpus().length),
    memoryMb: Math.max(1, Math.floor(totalmem() / (1024 * 1024))),
    containerMode: readContainerMode(),
  };
}
