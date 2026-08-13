// TASK-543 smoke-command-builders (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  POSTS_LIST_URL,
  POST_CLOSE_SELECTOR,
  POST_TITLE_SELECTOR,
  SMOKE_SESSION_PREFIX,
  SMOKE_SETUP_STORAGE_KEY,
} from "./task-543-smoke-schema.mjs";
import {
  receiptIntegrityValid,
  sameRawValue,
  stableSerialize,
  uniqueNumbers,
} from "./task-543-gate-contracts.mjs";

const ROOT = "/home/coder/project/Coderso";

export function rawPlaywrightReceiptValid(receipt) {
  if (!receiptIntegrityValid(receipt)) return false;
  if (!receipt.command.startsWith("playwright-cli ") || !receipt.command.includes(" --raw ")) {
    return true;
  }
  if (receipt.command.includes(" --raw run-code ")) {
    if (receipt.stdout === "\n") return receipt.parsedOutput === null;
    try {
      const parsed = JSON.parse(receipt.stdout);
      return (
        sameRawValue(parsed, receipt.parsedOutput) &&
        receipt.stdout === `${JSON.stringify(parsed)}\n`
      );
    } catch {
      return false;
    }
  }
  if (receipt.command.includes(" --raw resize ")) {
    return receipt.stdout === "\n" && receipt.parsedOutput === null;
  }
  return true;
}

export function expectedProcessCheckCommand(pid) {
  return `bash -lc 'if kill -0 -- ${pid} 2>/dev/null; then exit 1; fi'`;
}

export function expectedPortCheckCommand(port) {
  return `/usr/bin/lsof -nP -iTCP:${port} -sTCP:LISTEN -t`;
}

export function expectedHelperLaunchCommand(nonce) {
  return (
    `bash -lc 'CODERSO_WF543_LAUNCH_NONCE=${nonce} ` +
    `coderso-dev-core-host ${ROOT} >/dev/null 2>&1 & printf "%s\\n" "$!"'`
  );
}

export function expectedHelperIdentityCommands(identity) {
  const pid = identity.rootPid;
  return {
    ppid:
      `node --eval 'const fs=require("node:fs"); const t=fs.readFileSync("/proc/"+process.argv[1]+"/stat","utf8"); ` +
      'process.stdout.write(t.slice(t.lastIndexOf(") ")+2).trim().split(/\\s+/)[1])\' -- ' +
      pid,
    startTicks:
      `node --eval 'const fs=require("node:fs"); const t=fs.readFileSync("/proc/"+process.argv[1]+"/stat","utf8"); ` +
      'process.stdout.write(t.slice(t.lastIndexOf(") ")+2).trim().split(/\\s+/)[19])\' -- ' +
      pid,
    cmdline: `/usr/bin/tr '\\0' ' ' </proc/${pid}/cmdline`,
    cwd: `/usr/bin/readlink -f /proc/${pid}/cwd`,
    cmdlineHash: `/usr/bin/sha256sum /proc/${pid}/cmdline`,
    nonce:
      `bash -lc '/usr/bin/tr "\\0" "\\n" </proc/${pid}/environ | ` +
      `/usr/bin/grep -Fqx "CODERSO_WF543_LAUNCH_NONCE=${identity.launchNonce}"'`,
  };
}

export function expectedHelperStopCommand(identity) {
  const source =
    'const fs=require("node:fs"); const crypto=require("node:crypto"); ' +
    "const [pidText,ppid,startTicks,cmdlineHash,cwd,nonce]=process.argv.slice(1); " +
    'const pid=Number(pidText); const base="/proc/"+pid; ' +
    'const stat=fs.readFileSync(base+"/stat","utf8").slice(fs.readFileSync(base+"/stat","utf8").lastIndexOf(") ")+2).trim().split(/\\s+/); ' +
    'const actualHash=crypto.createHash("sha256").update(fs.readFileSync(base+"/cmdline")).digest("hex"); ' +
    'const env=fs.readFileSync(base+"/environ").toString("utf8").split("\\0"); ' +
    'if(stat[1]!==ppid||stat[19]!==startTicks||actualHash!==cmdlineHash||fs.realpathSync(base+"/cwd")!==cwd||!env.includes("CODERSO_WF543_LAUNCH_NONCE="+nonce)) throw new Error("wf543_helper_identity_mismatch"); ' +
    'process.kill(pid,"SIGTERM"); const deadline=Date.now()+10000; const sleeper=new Int32Array(new SharedArrayBuffer(4)); ' +
    'const sameProcess=()=>{try{const current=fs.readFileSync(base+"/stat","utf8"); return current.slice(current.lastIndexOf(") ")+2).trim().split(/\\s+/)[19]===startTicks;}catch{return false;}}; ' +
    'while(sameProcess()&&Date.now()<deadline) Atomics.wait(sleeper,0,0,25); if(sameProcess()) throw new Error("wf543_helper_stop_timeout")';
  return (
    `node --eval '${source}' -- ${identity.rootPid} ${identity.ppid} ` +
    `${identity.startTicks} ${identity.cmdlineSha256} ${identity.cwd} ${identity.launchNonce}`
  );
}

export function expectedPidTreeDiscoveryCommand(pid) {
  return `/usr/bin/pstree -p ${pid}`;
}

export function expectedPortOwnershipDiscoveryCommand(pids) {
  const orderedPids = [...pids].sort((left, right) => left - right).join(",");
  return `/usr/bin/lsof -nP -a -p ${orderedPids} -iTCP -sTCP:LISTEN -FpPn`;
}

export function expectedScreenshotStatCommand(path) {
  return (
    'node --eval \'const s=require("node:fs").statSync(process.argv[1]); ' +
    "process.stdout.write(JSON.stringify({size:s.size,inode:String(s.ino),mtimeEpochMs:s.mtimeMs}))' " +
    `-- ${path}`
  );
}

export function expectedScreenshotHashCommand(path) {
  return `/usr/bin/sha256sum ${path}`;
}

export function expectedScreenshotSignatureCommand(path) {
  return `/usr/bin/xxd -p -l 8 ${path}`;
}

export function expectedScreenshotCaptureCommand(path) {
  return `${SMOKE_SESSION_PREFIX}screenshot --filename ${path} --full-page`;
}

export function repoRelativePath(path) {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : null;
}

export function expectedScreenshotStdout(path) {
  const relativePath = repoRelativePath(path);
  return relativePath ? `- [Screenshot of full page](${relativePath})\n` : null;
}

export function smokeRunCode(source) {
  if (source.includes("'")) throw new Error("TASK-543 canonical run-code contains a shell quote");
  return `${SMOKE_SESSION_PREFIX}run-code '${source}'`;
}

export function expectedResponsiveProbeCommand(fixture) {
  const titleName = JSON.stringify(`Edit post: ${fixture.title}`);
  return smokeRunCode(
    `async (page) => { const output = await page.evaluate((titleName) => { const links = [...document.querySelectorAll("a[aria-label]")].filter((link) => link.getAttribute("aria-label") === titleName); const link = links[0] ?? null; const row = link?.closest("tr") ?? null; const cells = row?.querySelectorAll("td") ?? []; const fallback = row?.querySelector("[data-post-row-metadata=\\"fallback\\"]") ?? null; const fallbackStatus = row?.querySelector("[data-post-row-status-fallback=\\"true\\"]") ?? null; const fallbackAuthor = fallback?.querySelector(":scope > span:not([aria-hidden]):not([data-post-row-status-fallback])") ?? null; const fallbackDate = fallback?.querySelector(":scope > time") ?? null; const columnStatus = cells[2] ?? null; const columnAuthor = cells[3]?.querySelector("span.text-sm") ?? null; const columnDate = cells[4] ?? null; const table = row?.closest("table") ?? null; const node = (element) => { if (!element) return { exists: false, display: "", visibility: "", opacity: 0, width: 0, height: 0, visible: false, text: "" }; const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); const opacity = Number(style.opacity); const visible = style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && opacity > 0 && rect.width > 0 && rect.height > 0; return { exists: true, display: style.display, visibility: style.visibility, opacity, width: rect.width, height: rect.height, visible, text: element.textContent?.trim() ?? "" }; }; const nodes = { fallbackMetadata: node(fallback), fallbackStatus: node(fallbackStatus), fallbackAuthor: node(fallbackAuthor), fallbackDate: node(fallbackDate), columnStatus: node(columnStatus), columnAuthor: node(columnAuthor), columnDate: node(columnDate), row: node(row), table: node(table) }; const href = link?.getAttribute("href") ?? ""; const rowPostId = href ? decodeURIComponent(new URL(href, window.location.origin).pathname.split("/").filter(Boolean).at(-1) ?? "") : ""; return { width: window.innerWidth, matchedRowCount: links.length, rowPostId, fallbackMetadataVisible: nodes.fallbackMetadata.visible, fallbackStatusVisible: nodes.fallbackStatus.visible, fallbackAuthorVisible: nodes.fallbackAuthor.visible, fallbackDateVisible: nodes.fallbackDate.visible, columnStatusVisible: nodes.columnStatus.visible, columnAuthorVisible: nodes.columnAuthor.visible, columnDateVisible: nodes.columnDate.visible, visibleStatusCopies: Number(nodes.fallbackStatus.visible) + Number(nodes.columnStatus.visible), visibleAuthorCopies: Number(nodes.fallbackAuthor.visible && nodes.fallbackAuthor.text.length > 0) + Number(nodes.columnAuthor.visible && nodes.columnAuthor.text.length > 0), visibleDateCopies: Number(nodes.fallbackDate.visible && nodes.fallbackDate.text.length > 0) + Number(nodes.columnDate.visible && nodes.columnDate.text.length > 0), titleAccessibleName: link?.getAttribute("aria-label") ?? "", checkboxAccessibleName: cells[0]?.querySelector("button")?.getAttribute("aria-label") ?? "", actionAccessibleName: cells[5]?.querySelector("button")?.getAttribute("aria-label") ?? "", nodes, rowWidth: nodes.row.width, tableWidth: nodes.table.width }; }, ${titleName}); const state = page.__wf543Scenario; state.responsiveOutputs = [...(state.responsiveOutputs ?? []), output]; return output; }`
  );
}

export function expectedThemeStateReadCommand() {
  return smokeRunCode(
    '(page) => page.evaluate(() => ({ url: window.location.href, storedPreference: localStorage.getItem("coderso-admin-color-mode"), darkClass: document.documentElement.classList.contains("dark"), lightClass: document.documentElement.classList.contains("light") }))'
  );
}

export function expectedThemeStateRestoreCommand(state) {
  const snapshot = stableSerialize({
    storedPreference: state.storedPreference,
    darkClass: state.darkClass,
    lightClass: state.lightClass,
  });
  return smokeRunCode(
    `(page) => page.evaluate((state) => { if (state.storedPreference === null) localStorage.removeItem("coderso-admin-color-mode"); else localStorage.setItem("coderso-admin-color-mode", state.storedPreference); document.documentElement.classList.toggle("dark", state.darkClass); document.documentElement.classList.toggle("light", state.lightClass); return { url: window.location.href, storedPreference: localStorage.getItem("coderso-admin-color-mode"), darkClass: document.documentElement.classList.contains("dark"), lightClass: document.documentElement.classList.contains("light") }; }, ${snapshot})`
  );
}

export function expectedThemeApplyCommand(theme) {
  return smokeRunCode(
    `(page) => page.evaluate((mode) => { localStorage.setItem("coderso-admin-color-mode", mode); document.documentElement.classList.toggle("dark", mode === "dark"); document.documentElement.classList.toggle("light", mode === "light"); return { url: window.location.href, preference: localStorage.getItem("coderso-admin-color-mode") === "dark" ? "dark" : "light", resolved: document.documentElement.classList.contains("dark") ? "dark" : "light" }; }, ${JSON.stringify(theme)})`
  );
}

export function expectedSetupStateReadCommand() {
  return smokeRunCode(
    `(page) => page.evaluate((key) => ({ url: window.location.href, value: sessionStorage.getItem(key) }), ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)})`
  );
}

export function expectedSetupStateRestoreCommand(value) {
  const serialized = value === null ? "null" : JSON.stringify(value);
  return smokeRunCode(
    `(page) => page.evaluate(({ key, value }) => { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); return { url: window.location.href, value: sessionStorage.getItem(key) }; }, { key: ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)}, value: ${serialized} })`
  );
}

export function expectedFixtureCreatePayload(fixture) {
  return {
    title: fixture.title,
    slug: fixture.slug,
    data: {},
  };
}

export function expectedFixtureCleanPayload(fixture) {
  const createPayload = expectedFixtureCreatePayload(fixture);
  return {
    title: createPayload.title,
    slug: createPayload.slug,
    data: {
      document: {
        version: 1,
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {
              align: "left",
              width: "auto",
              spacingTop: "md",
              spacingBottom: "md",
              textScale: "md",
              highlight: false,
              hideOnMobile: false,
            },
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "" }],
            },
          },
        ],
        meta: {
          readingTimeMinutes: 0,
          typography: { fontFamily: "sans", baseTextScale: "md" },
        },
      },
    },
    tags: [],
    taxonomy: { categoryId: null },
    seo: {
      title: null,
      description: null,
      canonicalUrl: null,
      robots: "index,follow",
    },
  };
}

export function expectedFixtureCreateCommand(fixture) {
  const seed = stableSerialize({
    title: fixture.title,
    slug: fixture.slug,
    createPayload: expectedFixtureCreatePayload(fixture),
    cleanPayload: expectedFixtureCleanPayload(fixture),
  });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const newPost = page.getByRole("button", { name: "New post", exact: true }); const newPostControlName = (await newPost.getAttribute("aria-label")) ?? (await newPost.textContent())?.trim() ?? ""; await newPost.click(); const drawerTitle = page.getByRole("heading", { name: "Create New Post", exact: true }); await drawerTitle.waitFor(); const drawerTitleText = (await drawerTitle.textContent())?.trim() ?? ""; await page.getByPlaceholder("e.g. Product launch update").fill(seed.title); await page.getByPlaceholder("product-launch-update").fill(seed.slug); const openAfterCreate = page.getByRole("checkbox", { name: "Open in editor after create", exact: true }); const openAfterCreateEnabled = await openAfterCreate.isChecked(); const createResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().split("?")[0].endsWith("/admin/api/posts")); const createButton = page.getByRole("button", { name: "Create Post", exact: true }); const createButtonName = (await createButton.textContent())?.trim() ?? ""; await createButton.click(); const createResponse = await createResponsePromise; if (!createResponse.ok()) throw new Error("wf543 real UI fixture create failed"); const createdPost = await createResponse.json(); const responsePostId = typeof createdPost?.id === "string" ? createdPost.id : ""; if (!responsePostId) throw new Error("wf543 create response PostDetail id missing"); const createRequestPayload = createResponse.request().postDataJSON(); return { id: responsePostId, responsePostId, title: seed.title, slug: seed.slug, cleanPayload: seed.cleanPayload, newPostControlName, drawerTitle: drawerTitleText, createButtonName, openAfterCreateEnabled, createRequestPayload, createResponseStatus: createResponse.status(), createResponseUrl: createResponse.url() }; }`
  );
}

export function expectedFixtureProvenanceCommand(fixture) {
  const seed = stableSerialize({
    id: fixture.id,
    responsePostId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
    openAfterCreateEnabled: fixture.openAfterCreateEnabled,
  });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; const expectedHref = "/admin/posts/" + encodeURIComponent(seed.responsePostId); const routeId = (value) => decodeURIComponent((value ?? "").split("?")[0].split("#")[0].split("/").filter(Boolean).at(-1) ?? ""); let postCreateUrl = page.url(); let postCreateRouteId = ""; if (seed.openAfterCreateEnabled) { await page.waitForURL(seed.editorUrl); postCreateUrl = page.url(); postCreateRouteId = routeId(postCreateUrl); } else { const createdLink = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await createdLink.waitFor(); postCreateUrl = page.url(); const createdHref = await createdLink.getAttribute("href"); postCreateRouteId = routeId(createdHref); } if (postCreateRouteId !== seed.responsePostId) throw new Error("wf543 post-create route id mismatch"); await page.goto(seed.editorUrl); await page.waitForURL(seed.editorUrl); const editorUrl = page.url(); const editorUrlId = routeId(editorUrl); const title = page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}); await title.waitFor(); const editorTitle = await title.inputValue(); if (editorUrlId !== seed.responsePostId || editorTitle !== seed.title) throw new Error("wf543 editor provenance mismatch"); await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const link = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await link.waitFor(); const domTitleAccessibleName = await link.getAttribute("aria-label"); const domHref = await link.getAttribute("href"); const domHrefId = routeId(domHref); if (domHrefId !== seed.responsePostId || domTitleAccessibleName !== "Edit post: " + seed.title) throw new Error("wf543 list provenance mismatch"); return { id: seed.id, responsePostId: seed.responsePostId, postCreateUrl, postCreateRouteId, editorUrl, editorUrlId, editorTitle, domTitleAccessibleName, domHref, domHrefId }; }`
  );
}

export function expectedFixtureDeleteCommand(fixture) {
  const seed = stableSerialize({ id: fixture.id, title: fixture.title });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const expectedHref = "/admin/posts/" + encodeURIComponent(seed.id); const link = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await link.waitFor(); const rowTitleAccessibleName = await link.getAttribute("aria-label"); const domHref = await link.getAttribute("href"); const row = link.locator("xpath=ancestor::tr"); const action = row.getByRole("button", { name: /^Actions for /u }); const actionAccessibleName = await action.getAttribute("aria-label"); await action.click(); const menuItem = page.getByRole("menuitem", { name: "Delete", exact: true }); const menuItemName = (await menuItem.textContent())?.trim() ?? ""; await menuItem.click(); const dialog = page.getByRole("dialog"); const dialogTitle = dialog.getByRole("heading", { name: "Delete post?", exact: true }); await dialogTitle.waitFor(); const dialogTitleText = (await dialogTitle.textContent())?.trim() ?? ""; const confirm = dialog.getByRole("button", { name: "Delete post", exact: true }); const confirmButtonName = (await confirm.textContent())?.trim() ?? ""; const deleteResponsePromise = page.waitForResponse((response) => response.request().method() === "DELETE" && response.url().split("?")[0].endsWith("/admin/api/posts/" + encodeURIComponent(seed.id))); await confirm.click(); const response = await deleteResponsePromise; if (!response.ok()) throw new Error("wf543 real UI fixture delete failed"); await link.waitFor({ state: "detached" }); const domLinkCount = await page.locator("a[href=" + JSON.stringify(expectedHref) + "]").count(); return { id: seed.id, deleted: domLinkCount === 0, responseStatus: response.status(), responseUrl: response.url(), rowTitleAccessibleName, domHref, actionAccessibleName, menuItemName, dialogTitle: dialogTitleText, confirmButtonName, domLinkCount }; }`
  );
}

export function expectedFixtureAbsenceCommand(fixture) {
  const seed = stableSerialize({ id: fixture.id, title: fixture.title });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); await page.reload(); await page.getByText("Loading posts...", { exact: true }).waitFor({ state: "hidden" }); const expectedHref = "/admin/posts/" + encodeURIComponent(seed.id); const domLinkCount = await page.locator("a[href=" + JSON.stringify(expectedHref) + "]").count(); if (domLinkCount !== 0) throw new Error("wf543 real UI fixture remains after reload"); return { id: seed.id, absent: true, listUrl: page.url(), reloaded: true, domLinkCount }; }`
  );
}

export function expectedScenarioSpec(scenario, fixture) {
  return {
    id: scenario.id,
    kind: scenario.kind,
    fixtureId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
    draftTitleA: fixture.draftTitleA,
    draftTitleB: fixture.draftTitleB,
  };
}

export function expectedAutosavePayload(fixture, title) {
  return { ...fixture.cleanPayload, title };
}

export function expectedManualPayload(fixture, title) {
  return {
    title,
    slug: fixture.cleanPayload.slug,
    data: fixture.cleanPayload.data,
  };
}

export function expectedMetadataPayload(fixture) {
  return {
    tags: fixture.cleanPayload.tags,
    taxonomy: fixture.cleanPayload.taxonomy,
    seo: fixture.cleanPayload.seo,
  };
}

export function scenarioTargetUrl(scenario, fixture) {
  return ["table-keyboard", "mid-viewport-metadata"].includes(scenario.kind)
    ? POSTS_LIST_URL
    : fixture.editorUrl;
}

export function expectedScenarioSetupCommand(scenario, fixture) {
  const spec = stableSerialize(expectedScenarioSpec(scenario, fixture));
  const targetUrl = JSON.stringify(scenarioTargetUrl(scenario, fixture));
  return smokeRunCode(
    `async (page) => { const previous = page.__wf543Scenario; if (previous?.listeners) { page.off("request", previous.listeners.request); page.off("framenavigated", previous.listeners.navigation); } const spec = ${spec}; const state = { spec, mutations: [], navigationUrls: [], pendingRoutes: [], routeHandlers: new Map(), routeAttempts: 0, table: {} }; const basePath = "/admin/api/posts/" + encodeURIComponent(spec.fixtureId); const onRequest = (request) => { const method = request.method(); const raw = request.url(); const index = raw.indexOf(basePath); const path = index < 0 ? "" : raw.slice(index).split("?")[0]; if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || (path !== basePath && !path.startsWith(basePath + "/"))) return; let payload = null; try { payload = request.postDataJSON() ?? null; } catch { payload = null; } state.mutations.push({ method, path, payload }); }; const onNavigation = (frame) => { if (frame === page.mainFrame()) state.navigationUrls.push(frame.url()); }; page.on("request", onRequest); page.on("framenavigated", onNavigation); state.listeners = { request: onRequest, navigation: onNavigation }; page.__wf543Scenario = state; await page.goto(${targetUrl}); const setupValue = await page.evaluate(({ key, value }) => { sessionStorage.setItem(key, value); return sessionStorage.getItem(key); }, { key: ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)}, value: spec.id }); state.navigationUrls = []; state.initialTitle = spec.kind === "table-keyboard" || spec.kind === "mid-viewport-metadata" ? spec.title : await page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).inputValue(); if (spec.kind === "double-close") await page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).evaluate((button) => { button.dataset.wf543DomClickEvents = "0"; const listener = () => { button.dataset.wf543DomClickEvents = String(Number(button.dataset.wf543DomClickEvents ?? "0") + 1); }; button.addEventListener("click", listener); button.__wf543ClickListener = listener; }); return { url: page.url(), ready: true, scenarioId: spec.id, fixtureId: spec.fixtureId, setupValue }; }`
  );
}

export function expectedRouteInstallCommand(pattern, mode) {
  return smokeRunCode(
    `async (page) => { const state = page.__wf543Scenario; if (!state) throw new Error("wf543 scenario missing"); const pattern = ${JSON.stringify(pattern)}; const mode = ${JSON.stringify(mode)}; let attempts = 0; const handler = async (route) => { attempts += 1; state.routeAttempts = attempts; if (mode === "failure" && attempts === 1) { await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); return; } if (mode === "delay") await new Promise((resolve) => state.pendingRoutes.push(resolve)); await route.continue(); }; state.routeHandlers.set(pattern, handler); await page.route(pattern, handler); return { pattern, installed: true, mode }; }`
  );
}

export function expectedRouteRemovalCommand(pattern) {
  return smokeRunCode(
    `async (page) => { const state = page.__wf543Scenario; const pattern = ${JSON.stringify(pattern)}; const handler = state?.routeHandlers?.get(pattern); let releasedPending = 0; while (state?.pendingRoutes?.length) { state.pendingRoutes.shift()(); releasedPending += 1; } if (handler) await page.unroute(pattern, handler); state?.routeHandlers?.delete(pattern); return { pattern, removed: true, releasedPending }; }`
  );
}

export function titleFillCommand(value) {
  return smokeRunCode(
    `(page) => page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).fill(${JSON.stringify(value)})`
  );
}

export function closeClickCommand() {
  return smokeRunCode(`(page) => page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).click()`);
}

export function expectedScenarioActionCommands(scenario, fixture) {
  switch (scenario.kind) {
    case "clean-close":
      return [closeClickCommand()];
    case "dirty-delayed-close":
    case "failure-retry":
      return [titleFillCommand(fixture.draftTitleA), closeClickCommand()];
    case "pending-revert-restoration":
      return [
        titleFillCommand(fixture.draftTitleA),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const deadline = Date.now() + 8000; while (state.pendingRoutes.length < 1) { if (Date.now() > deadline) throw new Error("wf543 first save did not reach delay route"); await page.waitForTimeout(25); } await page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).fill(${JSON.stringify(fixture.draftTitleB)}); await page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).click(); return { edited: true, closeActivated: true }; }`
        ),
      ];
    case "double-close":
      return [
        titleFillCommand(fixture.draftTitleA),
        smokeRunCode(
          `(page) => page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).evaluate((button) => { button.click(); button.click(); return { domClickEvents: Number(button.dataset.wf543DomClickEvents ?? "0") }; })`
        ),
      ];
    case "table-keyboard": {
      const titleName = `Edit post: ${fixture.title}`;
      const checkboxName = `Select ${fixture.title}`;
      const actionName = `Actions for ${fixture.title}`;
      return [
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const navigationBefore = state.navigationUrls.length; await page.getByRole("link", { name: ${JSON.stringify(titleName)}, exact: true }).press("Enter"); await page.waitForURL(${JSON.stringify(fixture.editorUrl)}); state.table.titleUrl = page.url(); state.table.titleNavigationCount = state.navigationUrls.length - navigationBefore; await page.goBack(); await page.waitForURL(${JSON.stringify(POSTS_LIST_URL)}); return { key: "Enter", url: state.table.titleUrl }; }`
        ),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const checkbox = page.getByRole("checkbox", { name: ${JSON.stringify(checkboxName)}, exact: true }); const before = await checkbox.isChecked(); const navigationBefore = state.navigationUrls.length; await checkbox.press("Space"); state.table.checkboxToggled = (await checkbox.isChecked()) !== before; state.table.checkboxNavigationCount = state.navigationUrls.length - navigationBefore; return { key: "Space", toggled: state.table.checkboxToggled }; }`
        ),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const navigationBefore = state.navigationUrls.length; await page.getByRole("button", { name: ${JSON.stringify(actionName)}, exact: true }).press("Enter"); const menu = page.getByRole("menu"); state.table.actionMenuOpened = await menu.isVisible(); await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" }); state.table.actionNavigationCount = state.navigationUrls.length - navigationBefore; return { key: "Enter", menuOpened: state.table.actionMenuOpened, dismissed: true }; }`
        ),
      ];
    }
    case "mid-viewport-metadata":
      return [
        smokeRunCode(
          `(page) => page.getByRole("link", { name: ${JSON.stringify(`Edit post: ${fixture.title}`)}, exact: true }).evaluate((link) => ({ ariaLabel: link.getAttribute("aria-label"), href: link.getAttribute("href") }))`
        ),
      ];
    default:
      return [];
  }
}


export function sessionListContains(output, sessionName) {
  return parsedSessionNames(output).includes(sessionName);
}

export function parseSessionListOutput(output) {
  if (output === "  (no browsers)\n") return [];
  if (typeof output !== "string") return null;
  const lines = String(output).split("\n");
  if (lines.pop() !== "" || lines.shift() !== "### Browsers" || lines.length === 0) {
    return null;
  }
  const sessions = [];
  while (lines.length > 0) {
    const nameMatch = /^- ([A-Za-z0-9._-]+):$/u.exec(lines.shift() ?? "");
    if (!nameMatch || sessions.includes(nameMatch[1])) return null;
    sessions.push(nameMatch[1]);
    if (lines.shift() !== "  - status: open") return null;
    if (/^  - version: v[^\r\n]+ \[incompatible please re-open\]$/u.test(lines[0] ?? "")) {
      lines.shift();
    }
    const browserTypeMatch = /^  - browser-type: [A-Za-z0-9._-]+( \(attached\))?$/u.exec(
      lines[0] ?? ""
    );
    const attached = browserTypeMatch?.[1] !== undefined;
    if (browserTypeMatch) lines.shift();
    if (attached) continue;
    if (!/^  - user-data-dir: (?:<in-memory>|[^\r\n]+)$/u.test(lines.shift() ?? "")) {
      return null;
    }
    if (/^  - headed: (?:true|false)$/u.test(lines[0] ?? "")) lines.shift();
  }
  return sessions;
}

export function parsedSessionNames(output) {
  return parseSessionListOutput(output) ?? [];
}

export function sessionListOutputValid(output) {
  return parseSessionListOutput(output) !== null;
}


export function parsePstreePids(output) {
  return uniqueNumbers([...String(output).matchAll(/\((\d+)\)/g)].map((match) => Number(match[1])));
}

export function parseLsofOwnerPids(output) {
  return uniqueNumbers(
    String(output)
      .split(/\r?\n/)
      .filter((line) => /^p\d+$/.test(line))
      .map((line) => Number(line.slice(1)))
  );
}

export function parseLsofPorts(output) {
  return uniqueNumbers(
    String(output)
      .split(/\r?\n/)
      .filter((line) => line.startsWith("n"))
      .map((line) => /:(\d+)(?:\s|$)/.exec(line)?.[1])
      .filter(Boolean)
      .map(Number)
  );
}

export function parseLsofMappings(output) {
  const mappings = new Map();
  let currentPid = null;
  for (const line of String(output).split(/\r?\n/)) {
    if (/^p\d+$/.test(line)) {
      currentPid = Number(line.slice(1));
      continue;
    }
    const port = line.startsWith("n") ? Number(/:(\d+)(?:\s|$)/.exec(line)?.[1]) : NaN;
    if (currentPid !== null && Number.isInteger(port)) {
      const owners = mappings.get(port) ?? [];
      owners.push(currentPid);
      mappings.set(port, uniqueNumbers(owners));
    }
  }
  return mappings;
}

