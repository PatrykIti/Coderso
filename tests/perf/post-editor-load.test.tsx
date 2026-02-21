import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostBlockRuntimeRenderer } from "../../core/services/posts/runtime/postBlockRuntimeRenderer";
import { mapPostDocumentForRuntime } from "../../core/services/posts/runtime/postBlockRuntimeMapper";

const percentile = (values: number[], target: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
};

const readBudget = (envKey: string, fallback: number) => {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const createDocument = (seed: number) => ({
  version: 1 as const,
  blocks: Array.from({ length: 40 }, (_, index) => ({
    id: `block-${seed}-${index}`,
    type: index % 5 === 0 ? "heading" : index % 3 === 0 ? "list" : "paragraph",
    attrs:
      index % 5 === 0
        ? { level: 2 + (index % 4) }
        : index % 3 === 0
          ? { ordered: index % 2 === 0 }
          : {},
    content:
      index % 3 === 0
        ? [`Item ${seed}-${index}-1`, `Item ${seed}-${index}-2`]
        : `<p>Post block runtime performance sample ${seed}-${index}</p>`,
  })),
  meta: {},
});

test("performance gate: post runtime map+render p95 stays within budget", async () => {
  const budgetMs = readBudget("CODERSO_PERF_POST_EDITOR_P95_MS", 220);
  const samples: number[] = [];

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const startedAt = performance.now();
    const mapped = await mapPostDocumentForRuntime({
      document: createDocument(iteration),
    });
    renderToString(<PostBlockRuntimeRenderer document={mapped} />);
    samples.push(performance.now() - startedAt);
  }

  expect(percentile(samples, 95)).toBeLessThan(budgetMs);
});
