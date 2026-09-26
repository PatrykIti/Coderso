// TASK-551 dispatch-contract helper (single owner: TASK-551-11 sidecar).
//
// This module deliberately has no filesystem access. The
// author-audit workflow supplies an own-data snapshot of the current HEAD and
// TASK-551 task files; this helper validates the bytes-derived task metadata,
// graph, and leaf envelopes before returning a frozen dispatch projection.

import {
  TASK551_ENVELOPE_SCHEMA,
  TASK551_GRAPH_SCHEMA,
  deepFreeze,
  fail,
  parseDuplicateKeyAwareJson,
  requireExactSequence,
  requireJsonRecord,
  requireLiteralId,
  requireNodeId,
  requireOwnDataArray,
  requireOwnDataRecord,
  requireRepoPath,
  requireText,
  requireUniqueStrings,
} from "./task-551-dispatch-primitives.mjs";
import { normalizeEnvelope } from "./task-551-dispatch-envelope.mjs";

const TASK551_SNAPSHOT_KEYS = Object.freeze(["sourceHead", "taskFiles"]);
const TASK551_TASK_FILE_KEYS = Object.freeze(["path", "text"]);
const TASK551_GRAPH_KEYS = Object.freeze(["schema", "version", "nodes"]);
const TASK551_GRAPH_NODE_KEYS = Object.freeze(["id", "taskId", "occurrenceId", "dependsOn"]);

const TASK551_ALLOWED_STATUSES = new Set([
  "⏳ To Do",
  "🚧 In Progress",
  "✅ Done",
  "⏭️ Superseded",
  "❌ Cancelled",
]);

const TASK551_TASKS_PREFIX = "_docs/_TASKS/";
const TASK551_FENCED_JSON = /^```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gmu;

function collectTask551JsonFences(text, path) {
  const records = [];
  for (const match of text.matchAll(TASK551_FENCED_JSON)) {
    const raw = match[1] ?? "";
    // Parse every bounded JSON fence before deciding whether it belongs to the
    // dispatch namespace. A raw substring check misses escaped schema strings
    // (for example `workflow-dispatch\\u002dgraph@v1`) and lets a second
    // authority evade the cardinality checks below.
    const parsed = parseDuplicateKeyAwareJson(raw, `json:${path}`);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const schema = parsed.schema;
    if (typeof schema !== "string" || !schema.startsWith("coderso.task551.workflow-dispatch"))
      continue;
    if (schema !== TASK551_GRAPH_SCHEMA && schema !== TASK551_ENVELOPE_SCHEMA) {
      fail(`json_schema_unsupported:${path}`);
    }
    records.push({ schema, value: parsed });
  }
  return records;
}

function readSingleMarkdownField(text, expression, code, { optional = false } = {}) {
  const matches = [...text.matchAll(expression)];
  if (matches.length === 0 && optional) return undefined;
  if (matches.length !== 1) fail(code);
  return matches[0][1];
}

function expectedTaskIdFromPath(path) {
  const basename = path.slice(TASK551_TASKS_PREFIX.length);
  if (/^TASK-551_[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u.test(basename)) return "TASK-551";
  const leaf = basename.match(/^(TASK-551-[0-9]{2}-L[0-9]{2})-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u);
  if (leaf !== null) return leaf[1];
  const child = basename.match(/^(TASK-551-[0-9]{2})-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u);
  if (child !== null) return child[1];
  fail(`metadata_path_task_id:${path}`);
}

function readTask551Metadata(path, text) {
  const fileName = readSingleMarkdownField(
    text,
    /^# FileName: ([^\r\n]+)$/gmu,
    `metadata_filename:${path}`
  );
  const h1 = readSingleMarkdownField(
    text,
    /^# (TASK-551(?:-[0-9]{2}(?:-L[0-9]{2})?)?): [^\r\n]+$/gmu,
    `metadata_h1:${path}`
  );
  const status = readSingleMarkdownField(
    text,
    /^\*\*Status:\*\* ([^\r\n]+)$/gmu,
    `metadata_status:${path}`
  );
  const parentTaskId = readSingleMarkdownField(
    text,
    /^\*\*Parent Task:\*\* ([^\r\n]+)$/gmu,
    `metadata_parent_task:${path}`,
    { optional: true }
  );
  const parentSubtaskId = readSingleMarkdownField(
    text,
    /^\*\*Parent Subtask:\*\* ([^\r\n]+)$/gmu,
    `metadata_parent_subtask:${path}`,
    { optional: true }
  );
  const basename = path.slice(TASK551_TASKS_PREFIX.length);
  const expectedTaskId = expectedTaskIdFromPath(path);
  if (fileName !== basename || h1 !== expectedTaskId || !TASK551_ALLOWED_STATUSES.has(status)) {
    fail(`metadata_mismatch:${path}`);
  }
  if (h1 === "TASK-551") {
    if (parentTaskId !== undefined || parentSubtaskId !== undefined)
      fail(`metadata_parent_root:${path}`);
    return { path, taskId: h1, status, kind: "parent" };
  }
  if (/^TASK-551-[0-9]{2}$/u.test(h1)) {
    if (parentTaskId !== "TASK-551" || parentSubtaskId !== undefined)
      fail(`metadata_parent_child:${path}`);
    return { path, taskId: h1, status, kind: "child" };
  }
  if (!/^TASK-551-[0-9]{2}-L[0-9]{2}$/u.test(h1)) fail(`metadata_task_id:${path}`);
  const expectedSubtask = h1.replace(/-L[0-9]{2}$/u, "");
  if (
    parentSubtaskId !== expectedSubtask ||
    (parentTaskId !== undefined && parentTaskId !== "TASK-551")
  ) {
    fail(`metadata_parent_leaf:${path}`);
  }
  return {
    path,
    taskId: h1,
    status,
    kind: "leaf",
    parentSubtaskId: expectedSubtask,
  };
}

function normalizeGraph(value, path) {
  requireJsonRecord(value, TASK551_GRAPH_KEYS, `graph_keys:${path}`);
  if (value.schema !== TASK551_GRAPH_SCHEMA || value.version !== 1) fail(`graph_identity:${path}`);
  const rawNodes = requireOwnDataArray(value.nodes, `graph_nodes:${path}`, { min: 1, max: 256 });
  const nodes = [];
  const knownNodeIds = new Set();
  const knownOccurrences = new Set();
  for (let index = 0; index < rawNodes.length; index += 1) {
    const rawNode = rawNodes[index];
    requireJsonRecord(rawNode, TASK551_GRAPH_NODE_KEYS, `graph_node:${path}`);
    const taskId = requireLiteralId(
      rawNode.taskId,
      `graph_node_task:${path}`,
      /^TASK-551-[0-9]{2}-L[0-9]{2}$/u
    );
    const occurrenceId = requireLiteralId(
      rawNode.occurrenceId,
      `graph_node_occurrence:${path}`,
      /^(?:initial|single|final)$/u
    );
    const id = requireNodeId(rawNode.id, `graph_node_id:${path}`);
    if (id !== `${taskId}:${occurrenceId}` || knownNodeIds.has(id)) fail(`graph_node_id:${path}`);
    const occurrenceKey = `${taskId}:${occurrenceId}`;
    if (knownOccurrences.has(occurrenceKey)) fail(`graph_occurrence_duplicate:${path}`);
    const dependsOn = requireUniqueStrings(
      requireOwnDataArray(rawNode.dependsOn, `graph_node_dependencies:${path}`, { max: 64 }),
      `graph_node_dependencies:${path}`,
      (dependency) => requireNodeId(dependency, `graph_node_dependencies:${path}`)
    );
    if ((index === 0 && dependsOn.length !== 0) || (index > 0 && dependsOn.length === 0)) {
      fail(`graph_dependency_order:${path}`);
    }
    if (dependsOn.some((dependency) => !knownNodeIds.has(dependency))) {
      fail(`graph_dependency_order:${path}`);
    }
    knownNodeIds.add(id);
    knownOccurrences.add(occurrenceKey);
    nodes.push(Object.freeze({ id, taskId, occurrenceId, dependsOn: Object.freeze(dependsOn) }));
  }
  const groups = new Map();
  for (const node of nodes) {
    const entries = groups.get(node.taskId) ?? [];
    entries.push(node.occurrenceId);
    groups.set(node.taskId, entries);
  }
  for (const occurrences of groups.values()) {
    const validSingle = occurrences.length === 1 && occurrences[0] === "single";
    const validPhased =
      occurrences.length === 2 && occurrences[0] === "initial" && occurrences[1] === "final";
    if (!validSingle && !validPhased) fail(`graph_occurrence_group:${path}`);
  }
  return Object.freeze(nodes);
}

function validateSnapshot(input) {
  requireOwnDataRecord(input, TASK551_SNAPSHOT_KEYS, "snapshot_shape");
  const sourceHead = requireLiteralId(input.sourceHead, "snapshot_head", /^[0-9a-f]{7,64}$/u);
  const rawFiles = requireOwnDataArray(input.taskFiles, "snapshot_files", { min: 1, max: 128 });
  const files = [];
  const paths = new Set();
  for (const rawFile of rawFiles) {
    requireOwnDataRecord(rawFile, TASK551_TASK_FILE_KEYS, "snapshot_file_shape");
    const path = requireRepoPath(rawFile.path, "snapshot_file_path");
    if (
      !path.startsWith(TASK551_TASKS_PREFIX) ||
      !/^TASK-551(?:[-_][A-Za-z0-9._-]+)?\.md$/u.test(path.slice(TASK551_TASKS_PREFIX.length)) ||
      paths.has(path)
    ) {
      fail("snapshot_file_path");
    }
    paths.add(path);
    files.push({ path, text: requireText(rawFile.text, "snapshot_file_text") });
  }
  return { sourceHead, files };
}

function reconcileTask551Dispatch({ sourceHead, files }) {
  const metadata = [];
  const jsonRecords = new Map();
  for (const file of files) {
    const record = readTask551Metadata(file.path, file.text);
    metadata.push(record);
    jsonRecords.set(file.path, collectTask551JsonFences(file.text, file.path));
  }
  if (new Set(metadata.map((record) => record.taskId)).size !== metadata.length) {
    fail("task_inventory_duplicate");
  }
  const parents = metadata.filter((record) => record.kind === "parent");
  const children = metadata.filter((record) => record.kind === "child");
  const leaves = metadata.filter((record) => record.kind === "leaf");
  if (parents.length !== 1 || children.length === 0 || leaves.length === 0)
    fail("task_inventory_shape");
  const parent = parents[0];
  const childIds = new Set(
    requireUniqueStrings(children, "task_child_duplicate", (child) => child.taskId)
  );
  for (const leaf of leaves) {
    if (!childIds.has(leaf.parentSubtaskId)) fail(`task_leaf_orphan:${leaf.path}`);
  }
  for (const child of children) {
    if (jsonRecords.get(child.path).length !== 0) fail(`task_child_envelope:${child.path}`);
  }
  const parentRecords = jsonRecords.get(parent.path);
  if (parentRecords.length !== 1 || parentRecords[0].schema !== TASK551_GRAPH_SCHEMA) {
    fail(`parent_graph:${parent.path}`);
  }
  const graph = normalizeGraph(parentRecords[0].value, parent.path);
  const envelopes = [];
  for (const leaf of leaves) {
    const records = jsonRecords.get(leaf.path);
    if (records.length !== 1 || records[0].schema !== TASK551_ENVELOPE_SCHEMA) {
      fail(`leaf_envelope:${leaf.path}`);
    }
    envelopes.push(normalizeEnvelope(records[0].value, leaf));
  }
  const envelopeByTask = new Map();
  for (const envelope of envelopes) {
    if (envelopeByTask.has(envelope.taskId)) fail(`envelope_task_duplicate:${envelope.path}`);
    envelopeByTask.set(envelope.taskId, envelope);
  }
  const graphTaskIds = new Set(graph.map((node) => node.taskId));
  if (
    graphTaskIds.size !== envelopeByTask.size ||
    [...graphTaskIds].some((taskId) => !envelopeByTask.has(taskId))
  ) {
    fail("graph_envelope_task_set");
  }
  const ownerByPath = new Map();
  for (const envelope of envelopes) {
    for (const path of envelope.allowlist) {
      const owner = ownerByPath.get(path);
      if (owner !== undefined && owner !== envelope.taskId) fail(`allowlist_cross_owner:${path}`);
      ownerByPath.set(path, envelope.taskId);
    }
  }
  const graphByTask = new Map();
  for (const node of graph) {
    const entries = graphByTask.get(node.taskId) ?? [];
    entries.push(node);
    graphByTask.set(node.taskId, entries);
  }
  const dispatchOrder = [];
  for (const [taskId, envelope] of envelopeByTask) {
    const expectedNodes = graphByTask.get(taskId) ?? [];
    const expectedOccurrences = expectedNodes.map((node) => node.occurrenceId);
    requireExactSequence(
      envelope.occurrences.map((occurrence) => occurrence.id),
      expectedOccurrences,
      `occurrence_graph_set:${envelope.path}`
    );
    const expectedDependencies = [];
    for (const node of expectedNodes) {
      for (const dependency of node.dependsOn) {
        if (!expectedDependencies.includes(dependency)) expectedDependencies.push(dependency);
      }
    }
    requireExactSequence(
      envelope.dependencies,
      expectedDependencies,
      `envelope_dependencies:${envelope.path}`
    );
    for (let index = 0; index < expectedNodes.length; index += 1) {
      const node = expectedNodes[index];
      const occurrence = envelope.occurrences[index];
      requireExactSequence(
        occurrence.dependsOn,
        node.dependsOn,
        `occurrence_dependencies:${envelope.path}`
      );
    }
  }
  for (const node of graph) {
    const envelope = envelopeByTask.get(node.taskId);
    const occurrence = envelope.occurrences.find((candidate) => candidate.id === node.occurrenceId);
    const commandById = new Map(envelope.commands.map((command) => [command.id, command]));
    dispatchOrder.push(
      Object.freeze({
        id: node.id,
        taskId: node.taskId,
        occurrenceId: node.occurrenceId,
        dependsOn: Object.freeze([...node.dependsOn]),
        allowlist: Object.freeze([...envelope.allowlist]),
        forbiddenPaths: Object.freeze([...envelope.forbiddenPaths]),
        artifactPolicy: envelope.artifactPolicy,
        workflowPrerequisites: Object.freeze([...envelope.workflowPrerequisites]),
        commands: Object.freeze(
          occurrence.commandIds.map((commandId) => commandById.get(commandId))
        ),
        subgates: Object.freeze(
          envelope.subgates.filter((subgate) => subgate.occurrenceId === node.occurrenceId)
        ),
      })
    );
  }
  const taskFiles = metadata
    .map((record) =>
      Object.freeze({
        path: record.path,
        taskId: record.taskId,
        status: record.status,
        kind: record.kind,
        ...(record.parentSubtaskId === undefined
          ? {}
          : { parentSubtaskId: record.parentSubtaskId }),
      })
    )
    .sort((left, right) => left.path.localeCompare(right.path));
  return deepFreeze({
    sourceHead,
    inventory: {
      taskFileCount: taskFiles.length,
      childTaskCount: children.length,
      leafTaskCount: leaves.length,
      occurrenceCount: graph.length,
    },
    taskFiles,
    dispatchOrder,
  });
}

/**
 * Validates a strict own-data current-HEAD task-file snapshot and returns a
 * frozen dispatch projection. Neither markdown nor raw JSON source escapes
 * this function, so consumers cannot reparse or mutate the verified inputs.
 */
export function preflightTask551DispatchSnapshot(snapshot) {
  return reconcileTask551Dispatch(validateSnapshot(snapshot));
}
