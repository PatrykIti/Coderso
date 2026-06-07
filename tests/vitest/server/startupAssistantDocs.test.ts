import { describe, expect, test, vi } from "vitest";

import {
  STARTUP_ASSISTANT_DOCS_ENV,
  computeAssistantDocsFingerprint,
  isStartupAssistantDocsState,
  resolveStartupAssistantDocsDecision,
  resolveStartupAssistantDocsImageVersion,
  resolveStartupAssistantDocsSourceRoot,
  runStartupAssistantDocsReindex,
  type StartupAssistantDocsDeps,
  type StartupAssistantDocsState,
} from "../../../core/server/startupAssistantDocs";

function createLogger() {
  return {
    error: vi.fn<(message: string) => void>(),
    log: vi.fn<(message: string) => void>(),
  };
}

function createDeps(overrides: Partial<StartupAssistantDocsDeps> = {}): StartupAssistantDocsDeps {
  return {
    computeFingerprint: vi.fn(async () => "docs-fingerprint-1"),
    readState: vi.fn(async () => null),
    writeState: vi.fn(async () => {}),
    reindex: vi.fn(async () => ({
      status: "success" as const,
      docsUpserted: 3,
      chunksUpserted: 24,
    })),
    withLock: async (action) => action(),
    ...overrides,
  };
}

describe("resolveStartupAssistantDocsDecision", () => {
  test("enables startup assistant docs reindex by default", () => {
    expect(resolveStartupAssistantDocsDecision({})).toEqual({
      enabled: true,
      reason: "default_enabled",
    });
  });

  test("disables startup assistant docs reindex for explicit opt-out values", () => {
    expect(
      resolveStartupAssistantDocsDecision({
        [STARTUP_ASSISTANT_DOCS_ENV]: "false",
      })
    ).toEqual({
      enabled: false,
      reason: `${STARTUP_ASSISTANT_DOCS_ENV}=false`,
    });
  });
});

describe("startup assistant docs config", () => {
  test("resolves source root and image version from env", () => {
    expect(resolveStartupAssistantDocsSourceRoot({})).toBe("docs/guide");
    expect(
      resolveStartupAssistantDocsSourceRoot({
        CODERSO_ASSISTANT_DOCS_SOURCE_ROOT: "custom/docs",
      })
    ).toBe("custom/docs");

    expect(resolveStartupAssistantDocsImageVersion({ CORE_VERSION: "2.3.4" })).toBe("2.3.4");
    expect(resolveStartupAssistantDocsImageVersion({ APP_VERSION: "2.3.5" })).toBe("2.3.5");
    expect(
      resolveStartupAssistantDocsImageVersion({
        CODERSO_IMAGE_VERSION: "2.3.6",
        CORE_VERSION: "2.3.4",
      })
    ).toBe("2.3.6");
  });

  test("validates persisted startup state shape", () => {
    const state: StartupAssistantDocsState = {
      imageVersion: "1.0.0",
      sourceRoot: "docs/guide",
      docsFingerprint: "abc",
      completedAt: "2026-06-04T00:00:00.000Z",
    };

    expect(isStartupAssistantDocsState(state)).toBe(true);
    expect(isStartupAssistantDocsState({ ...state, docsFingerprint: null })).toBe(false);
  });
});

describe("runStartupAssistantDocsReindex", () => {
  test("skips when disabled by env", async () => {
    const logger = createLogger();
    const deps = createDeps();

    const result = await runStartupAssistantDocsReindex({
      env: { [STARTUP_ASSISTANT_DOCS_ENV]: "false" },
      logger,
      deps,
    });

    expect(result).toEqual({
      ran: false,
      reason: `${STARTUP_ASSISTANT_DOCS_ENV}=false`,
    });
    expect(deps.reindex).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      `[startup] Assistant docs reindex skipped (${STARTUP_ASSISTANT_DOCS_ENV}=false)`
    );
  });

  test("skips when persisted image and docs fingerprint match", async () => {
    const logger = createLogger();
    const deps = createDeps({
      readState: vi.fn(async () => ({
        imageVersion: "1.2.3",
        sourceRoot: "docs/guide",
        docsFingerprint: "docs-fingerprint-1",
        completedAt: "2026-06-04T00:00:00.000Z",
      })),
    });

    const result = await runStartupAssistantDocsReindex({
      cwd: "/app",
      env: { CORE_VERSION: "1.2.3" },
      logger,
      deps,
    });

    expect(result).toMatchObject({
      ran: false,
      reason: "already_current",
      imageVersion: "1.2.3",
      docsFingerprint: "docs-fingerprint-1",
    });
    expect(deps.reindex).not.toHaveBeenCalled();
  });

  test("runs reindex and writes marker when image version changed", async () => {
    const logger = createLogger();
    const written: StartupAssistantDocsState[] = [];
    const deps = createDeps({
      readState: vi.fn(async () => ({
        imageVersion: "1.2.2",
        sourceRoot: "docs/guide",
        docsFingerprint: "docs-fingerprint-1",
        completedAt: "2026-06-03T00:00:00.000Z",
      })),
      writeState: vi.fn(async (state) => {
        written.push(state);
      }),
    });

    const result = await runStartupAssistantDocsReindex({
      cwd: "/app",
      env: { CORE_VERSION: "1.2.3" },
      logger,
      deps,
    });

    expect(result).toMatchObject({
      ran: true,
      sourceRoot: "docs/guide",
      imageVersion: "1.2.3",
      docsFingerprint: "docs-fingerprint-1",
      docsUpserted: 3,
      chunksUpserted: 24,
    });
    expect(deps.reindex).toHaveBeenCalledWith({ sourceRoot: "docs/guide", cwd: "/app" });
    expect(written[0]).toMatchObject({
      imageVersion: "1.2.3",
      sourceRoot: "docs/guide",
      docsFingerprint: "docs-fingerprint-1",
    });
  });

  test("does not write marker when reindex is partial", async () => {
    const deps = createDeps({
      reindex: vi.fn(async () => ({
        status: "partial" as const,
        docsUpserted: 1,
        chunksUpserted: 4,
      })),
    });

    await expect(
      runStartupAssistantDocsReindex({
        env: { CORE_VERSION: "1.2.3" },
        logger: createLogger(),
        deps,
      })
    ).rejects.toThrow("assistant_startup_docs_reindex_partial");

    expect(deps.writeState).not.toHaveBeenCalled();
  });
});

describe("computeAssistantDocsFingerprint", () => {
  test("hashes the current docs guide corpus", async () => {
    const fingerprint = await computeAssistantDocsFingerprint({
      sourceRoot: "docs/guide",
      cwd: process.cwd(),
    });

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
