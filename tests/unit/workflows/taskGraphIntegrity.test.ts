// TASK-545-04-L03 closure gate: the board graph must match physical task files.
//
// Whole-inventory graph/integrity gate over `_docs/_TASKS/`. It enumerates
// physical `TASK-*.md` files (never a recursive scan of other trees), requires
// canonical `# FileName:`/H1/`**Status:**` fields, validates parent linkage and
// closed-parent terminal descendants, and recalculates the board statistics
// (To Do / In Progress / Done / Superseded / Cancelled) from the same physical
// files it parses. The README statistics must equal that fresh count; a copied
// or assumed delta is rejected. It also pins the TASK-533 board changelog
// correction (1245 -> 1247) and asserts TASK-511 remains To Do while
// TASK-495..535 completed families were not reopened.

import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "../../..");
const TASKS_DIR = path.join(ROOT, "_docs", "_TASKS");
const README = path.join(TASKS_DIR, "README.md");

const STATUS_RE =
  /^\*\*Status:\*\*\s*(?:(⏳|✅|🚧|⏭️|❌)\s*\*{0,2}\s*)?(?<raw>To Do|In Progress|Done|Superseded|Cancelled)/mu;
const FILENAME_RE = /^# FileName:\s*(.+)$/mu;
const H1_RE = /^# (?<id>TASK-\d+(?:-\d+)*(?:-[LS]\d+)*)(?::|\s)/mu;
const PARENT_RE = /^\*\*Parent (?:Task|Subtask):\*\*\s*(TASK-\d+(?:-\d+)*(?:-[LS]\d+)*)/mu;
const BOARD_ROW_RE = /^\|\s*(TASK-\d+(?:-\d+)*)\s*\|/mu;

interface TaskFile {
  readonly file: string;
  readonly id: string;
  readonly fileName: string;
  readonly status: "todo" | "inprogress" | "done" | "superseded" | "cancelled";
  readonly parent: string | null;
}

function gitLsTaskFiles(): string[] {
  const bytes = execFileSync("git", ["ls-files", "-z", "--", "_docs/_TASKS/TASK-*.md"], {
    cwd: ROOT,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return bytes.toString("utf8").split("\0").filter(Boolean).sort();
}

function parseStatus(text: string): TaskFile["status"] | null {
  const m = STATUS_RE.exec(text);
  if (!m) return null;
  const raw = m.groups?.raw;
  if (raw === "To Do") return "todo";
  if (raw === "In Progress") return "inprogress";
  if (raw === "Done") return "done";
  if (raw === "Superseded") return "superseded";
  if (raw === "Cancelled") return "cancelled";
  return null;
}

function parseTaskFile(file: string): TaskFile {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const h1 = H1_RE.exec(text)?.groups?.id;
  const fileName = FILENAME_RE.exec(text)?.[1]?.trim();
  const status = parseStatus(text);
  if (!h1) throw new Error(`${file}: missing canonical H1 task id`);
  if (fileName !== path.basename(file))
    throw new Error(
      `${file}: FileName ${JSON.stringify(fileName)} != basename ${path.basename(file)}`
    );
  if (!status) throw new Error(`${file}: missing canonical Status field`);
  const parent = PARENT_RE.exec(text)?.[1] ?? null;
  return { file, id: h1, fileName, status, parent };
}

function readBoardStatistics(text: string): { todo: number; inprogress: number; done: number } {
  const get = (label: string): number => {
    const m = new RegExp(`\\*\\*${label}:\\*\\*\\s*(\\d+) tasks`).exec(text);
    if (!m) throw new Error(`README missing Statistics line for ${label}`);
    return Number(m[1]);
  };
  return {
    todo: get("To Do"),
    inprogress: get("In Progress"),
    done: get("Done"),
  };
}

describe("task graph integrity", () => {
  test("every tracked task file has canonical FileName/H1/Status and unique ids", () => {
    const files = gitLsTaskFiles();
    expect(files.length).toBeGreaterThan(3700);
    const seen = new Set<string>();
    for (const file of files) {
      const task = parseTaskFile(file);
      expect(task.fileName).toBe(path.basename(file));
      expect(seen.has(task.id)).toBe(false);
      seen.add(task.id);
    }
  });

  test("closed parents have no open physical descendants (by Parent field)", () => {
    const tasks = gitLsTaskFiles().map(parseTaskFile);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const task of tasks) {
      if (task.status !== "done") continue;
      for (const child of tasks) {
        if (
          child.parent === task.id &&
          child.status !== "done" &&
          child.status !== "superseded" &&
          child.status !== "cancelled"
        ) {
          throw new Error(`${task.id} is Done but open descendant ${child.id} exists`);
        }
      }
    }
    void byId;
  });

  test("every physical parent linkage resolves to a physical file", () => {
    const tasks = gitLsTaskFiles().map(parseTaskFile);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const task of tasks) {
      if (task.parent !== null && !byId.has(task.parent)) {
        throw new Error(`${task.id} references missing parent ${task.parent}`);
      }
    }
  });

  test("board statistics equal the fresh physical-file count", () => {
    const tasks = gitLsTaskFiles().map(parseTaskFile);
    const counts = { todo: 0, inprogress: 0, done: 0 };
    for (const t of tasks) {
      if (t.status === "todo") counts.todo += 1;
      else if (t.status === "inprogress") counts.inprogress += 1;
      else counts.done += 1; // done, superseded, cancelled all live in the Done bucket
    }
    const board = readBoardStatistics(readFileSync(README, "utf8"));
    expect(board).toEqual(counts);
  });

  test("TASK-533 board changelog resolves to 1247 and TASK-511 stays To Do", () => {
    const text = readFileSync(README, "utf8");
    const task533 = text.split("\n").find((l) => l.startsWith("| TASK-533 |"));
    expect(task533).toBeTruthy();
    expect(task533).toContain("1247");
    expect(task533).not.toContain("Changelog 1245");
    const task511 = gitLsTaskFiles()
      .map(parseTaskFile)
      .find((t) => t.id === "TASK-511");
    expect(task511?.status).toBe("todo");
  });

  test("TASK-495..535 completed families were not reopened", () => {
    const tasks = gitLsTaskFiles().map(parseTaskFile);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const reopened: string[] = [];
    for (const t of tasks) {
      const m = /^TASK-(49[5-9]|50[0-9]|51[0-9]|52[0-9]|53[0-5])(?:-|$)/.exec(t.id);
      if (!m) continue;
      // Only families whose parent is already Done count as "completed";
      // open families such as TASK-511/517/518 stay untouched by this gate.
      const parentId = t.parent ?? t.id;
      const parent = byId.get(parentId);
      if (parent?.status === "done" && (t.status === "todo" || t.status === "inprogress")) {
        reopened.push(t.id);
      }
    }
    expect(reopened).toEqual([]);
  });
});
