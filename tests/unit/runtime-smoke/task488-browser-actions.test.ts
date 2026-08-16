import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  projectTask488ScenarioResults,
  type Task488ScenarioObservation,
} from "../../../scripts/runtime-smoke/adapters/task-488/assertions";
import { materializeTask488BrowserDispatchPlan } from "../../../scripts/runtime-smoke/adapters/task-488/browser-actions";
import { task488AdminCredentials } from "../../../scripts/runtime-smoke/adapters/task-488/browser-input";
import { createTask488FixtureSpec } from "../../../scripts/runtime-smoke/adapters/task-488/fixture";
import { buildExactTask488ScreenshotManifest } from "../../../scripts/runtime-smoke/adapters/task-488/output-manifest";

async function materializedCommerceLoginSource(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "wf488-unit-"));
  try {
    const manifest = buildExactTask488ScreenshotManifest({
      command: "run",
      suite: "task-488",
      profile: "fast",
      session: "wf488-unit",
    });
    const fixture = createTask488FixtureSpec("0123456789ab", "/admin-panel");
    const plan = await materializeTask488BrowserDispatchPlan({
      root,
      manifest,
      fixture,
      credentials: task488AdminCredentials({
        CODERSO_PLAYWRIGHT_EMAIL: "smoke@example.com",
        CODERSO_PLAYWRIGHT_PASSWORD: "smoke-password",
      }),
      fixtureDigest: fixture.fixtureDigest,
    });
    expect(plan.segments.length).toBe(10);
    const commerceLogin = plan.segments.find(({ actions }) =>
      actions[0]?.source.includes('scenarioId === "commerce-login"')
    );
    if (commerceLogin === undefined) throw new Error("commerce-login segment is absent");
    return commerceLogin.actions[0]!.source;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("TASK-488 commerce nav assertion tolerates the Beta badge in the accessible name", async () => {
  // Regression guard: the advanced nav renders the Commerce item with a Beta
  // badge, so the accessible name is "Commerce Beta"; an exact-name lookup
  // drifts the envelope to false on every admin shell.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("name: /^Commerce/");
  expect(source).not.toContain('getByRole("link", { name: "Commerce", exact: true }');
});

test("TASK-488 browser segment suppresses known-benign admin console noise", async () => {
  // The admin boot produces expected resource errors (auth rate-limit 429,
  // unauthenticated /api/auth/me 401, and the unresolvable settings-provided
  // assistant avatar on cdn.example.com). The envelope still fails closed on
  // real console errors and on every assertion response/visible-effect check.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("the server responded with a status of 429");
  expect(source).toContain("the server responded with a status of 401");
  expect(source).toContain('loc.endsWith("/api/auth/me")');
  expect(source).toContain("net::ERR_NAME_NOT_RESOLVED");
  expect(source).toContain('loc.includes("cdn.example.com")');
});

test("TASK-488 browser segment fulfills the implicit favicon probe instead of relying on dev-server state", async () => {
  // The admin SPA declares no favicon, so Chromium probes /favicon.ico on
  // every boot and the dev server 404s it; the segment fulfills it in-browser
  // so the console stays clean regardless of the host's public assets.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain('page.route("**/favicon.ico"');
  expect(source).toContain("status: 204");
});

test("TASK-488 paint check walks ancestors and fails closed without hanging", async () => {
  // The admin shell paints its background on the layout root, not on <main>;
  // the surface check must walk up to that root instead of reading the
  // transparent main node, otherwise every painted assertion drifts. It also
  // fails closed (transparent) when the surface is absent instead of waiting
  // the default 30s locator budget and surfacing a generic timeout.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("let current = node;");
  expect(source).toContain("while (current) {");
  expect(source).toContain('value !== "rgba(0, 0, 0, 0)" && value !== "transparent"');
  expect(source).toContain("const count = await node.count().catch(() => 0);");
  expect(source).toContain('if (count === 0) return "transparent";');
});

test("TASK-488 every scenario authenticates itself when the session is lost", async () => {
  // A cold dev host can make the SPA auth bootstrap lose the session view
  // between segments, so the login variants and all shell scenarios must be
  // self-sufficient instead of depending on a previous segment's session.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("const ensureAuthenticated = async () => {");
  expect(source).toContain("const loginFormPresent = await emailInput");
  expect(source).toContain("if (session.status === 200) return;");
  expect(source).toContain("await ensureAuthenticated();");
});

test("TASK-488 localStorage writes pass one serialized arg to page.evaluate", async () => {
  // Regression guard: the bundled playwright-core evaluate() accepts at most
  // one serialized argument plus options. Passing (key, value) as two
  // positionals makes the second one land in options and throws
  // "Too many arguments..." the first time a scenario persists a fixture id.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("localStorage.setItem(payload.key, payload.value)");
  expect(source).toContain("{ key, value }");
  expect(source).not.toMatch(/page\.evaluate\(\(k, v\)/u);
});

test("TASK-488 collection-create re-reads editor ids after the collection write", async () => {
  // Regression guard: the light variant creates the collection mid-scenario,
  // so the product-editor verification must re-read localStorage AFTER that
  // write; capturing the ids earlier left them empty on the first run and
  // recorded collection-context-missing for both assignment assertions.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain('localSet("wf488.collectionId"');
  expect(source).toContain("editorProductId");
  expect(source).toContain("editorCollectionId");
  expect(source).toMatch(/editorProductId = \(await localGet\("wf488\.productId"\)\)/u);
  expect(source).not.toMatch(/resolvedProductId/u);
});

test("TASK-488 overflow assertions settle the layout before recording", async () => {
  // Regression guard: the admin shell can transiently widen during hydration
  // right after navigation, so the dark overflow assertions poll until the
  // layout reports 0 twice in a row instead of recording a one-shot false
  // positive that settles away.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain("const settledOverflowX");
  expect(source).toContain("current === 0 && previous === 0");
  expect(source).toContain("await page.waitForTimeout(250)");
  // The run-code sandbox evaluates actions in a node:vm context that exposes
  // only page (and __end__), so a bare setTimeout reference is undefined and
  // the poll must go through the Playwright API instead.
  expect(source).not.toContain("setTimeout");
  // The overflow assertions record the raw pixel value, because the descriptor
  // contract compares observed === "0" on a clean page; a boolean string never
  // matched and the assertions could not pass.
  expect(source).toContain('record("collection-no-overflow", String(await settledOverflowX()))');
  expect(source).toContain('record("parity-no-overflow", String(overflow));');
});

test("TASK-488 variant attribute authoring is fill-first and verifies persistence", async () => {
  // Regression guard: the AttributesEditor auto-commits the draft attribute as
  // soon as both key and value are present, so its "Add attribute" button is
  // disabled while the draft is empty. The old click-first flow waited 30s on
  // the disabled button (playwright_action_timeout) and never persisted the
  // attribute; authoring must fill key/value and then prove the commit via the
  // saved product's attributes map.
  const source = await materializedCommerceLoginSource();
  expect(source).toContain(
    'getByRole("textbox", { name: "New attribute key", exact: true }).fill("Size")'
  );
  expect(source).toContain(
    'getByRole("textbox", { name: "New attribute value", exact: true }).fill("L")'
  );
  expect(source).not.toContain(
    'getByRole("button", { name: "Add attribute", exact: true }).click()'
  );
  expect(source).toContain('item.attributes.Size === "L"');
  expect(source).toContain('record("variant-attribute-persisted", String(attributePersisted))');
  expect(source).toContain('check(attributePersisted, "variant-attribute-persist")');
});

test("TASK-488 screenshot projection resolves manifest paths against the run root", async () => {
  // Regression guard: observations carry the absolute screenshot path the
  // browser wrote to, while the validated screenshot results carry the
  // manifest-relative path; the projection must resolve the latter against the
  // same root or every observation lookup misses (screenshot result is absent)
  // after all ten scenarios already passed.
  const root = await mkdtemp(join(tmpdir(), "wf488-proj-"));
  try {
    const manifest = buildExactTask488ScreenshotManifest({
      command: "run",
      suite: "task-488",
      profile: "fast",
      session: "wf488-proj",
    });
    const observations = manifest.entries.map((entry) => ({
      schemaVersion: 1,
      scenarioId: entry.scenarioId,
      variantId: entry.variantId as "light" | "dark",
      descriptorSha256: "a".repeat(64),
      fixtureDigest: "b".repeat(64),
      assertions: Object.freeze([]),
      consoleErrors: Object.freeze([]),
      pageErrors: Object.freeze([]),
      failureCodes: Object.freeze([]),
      screenshotPath: resolve(root, entry.path),
      elapsedMs: 1,
    })) as unknown as readonly Task488ScenarioObservation[];
    const projected = projectTask488ScenarioResults(
      observations,
      Object.freeze(
        manifest.entries.map((entry) => Object.freeze({ path: entry.path, sha256: "c".repeat(64) }))
      ),
      root
    );
    expect(projected.length).toBe(5);
    const first = projected[0]!;
    expect(first.id).toBe(manifest.entries[0]!.scenarioId);
    expect(first.screenshots?.length).toBe(2);
    expect(first.screenshots?.[0]?.path).toBe(manifest.entries[0]!.path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
