// @vitest-environment node
import { describe, expect, it } from "vitest";
import ts from "typescript";

import {
  buildPopupRuntimeScript,
  injectPopupRuntime,
} from "../../../core/server/popupRuntimeScript";

/**
 * TASK-486-03-L02 — parse-guard + injection tests for the assembled popup
 * runtime script. Guards (per the task contract):
 *  (a) the emitted body parses as JavaScript,
 *  (b) it references no identifier that is not bound by the emitted `const`
 *      lines or a standard browser global (window, document, sessionStorage,
 *      localStorage, fetch, location, Date, Math, JSON, setTimeout,
 *      clearTimeout, encodeURIComponent, addEventListener,
 *      removeEventListener, requestAnimationFrame).
 *
 * If a future task adds a free variable to a serialized helper without
 * emitting the matching `const`, the guard fails with the missing name — the
 * same failure mode as a bare `fn.toString()` join producing ReferenceError.
 */

const MARKER = 'data-coderso-runtime-script="popups"';

const STANDARD_GLOBALS = new Set([
  "window",
  "document",
  "sessionStorage",
  "localStorage",
  "fetch",
  "location",
  "Date",
  "Math",
  "JSON",
  "setTimeout",
  "clearTimeout",
  "encodeURIComponent",
  "addEventListener",
  "removeEventListener",
  "requestAnimationFrame",
]);

const SERIALIZED_CONSTS = [
  "sameUtcDay",
  "SAFE",
  "scrollDepthPercent",
  "isSafeHref",
  "watchTrigger",
  "shouldShowPopup",
  "recordPopupShown",
  "renderPopup",
  "createPopupRuntime",
];

/** Extracts the JS body between the outer `<script ...>` and `</script>`. */
const extractBody = (script: string): string =>
  script.replace(/^<script[^>]*>/, "").replace(/<\/script>\s*$/, "");

/** Strips the emitted `const <name> = ...;` statement (single or multi line). */
const stripConst = (body: string, name: string): string => {
  const start = body.indexOf(`const ${name} =`);
  expect(start).toBeGreaterThanOrEqual(0);
  // Scan forward tracking brace/paren depth until the terminating `;\n` at
  // depth 0 (a serialized arrow function spans multiple lines).
  let depth = 0;
  let end = -1;
  for (let i = start; i < body.length; i += 1) {
    const c = body[i];
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    if (c === ";" && depth === 0 && body[i + 1] === "\n") {
      end = i + 2;
      break;
    }
  }
  expect(end).toBeGreaterThanOrEqual(0);
  return body.slice(0, start) + body.slice(end);
};

/**
 * Walks the script AST and returns every identifier that is referenced but
 * neither declared in the script nor a standard browser global. Property
 * access names (`.foo`), object keys, labels, and declaration positions are
 * not references.
 */
const findUnboundIdentifiers = (body: string): string[] => {
  const sf = ts.createSourceFile(
    "runtime.js",
    body,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const declared = new Set<string>();
  const refs = new Set<string>();

  const addBindingName = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) declared.add(name.text);
    else {
      for (const el of name.elements) {
        if (ts.isBindingElement(el)) addBindingName(el.name);
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) addBindingName(node.name);
    if (ts.isParameter(node)) addBindingName(node.name);
    if (ts.isFunctionDeclaration(node) && node.name) declared.add(node.name.text);
    if (ts.isFunctionExpression(node) && node.name) declared.add(node.name.text);
    if (ts.isCatchClause(node) && node.variableDeclaration)
      addBindingName(node.variableDeclaration.name);

    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      if (!parent) {
        refs.add(node.text);
      } else {
        const isDeclaration =
          (ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isParameter(parent) && parent.name === node) ||
          ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent)) &&
            parent.name === node) ||
          (ts.isCatchClause(parent) && parent.variableDeclaration?.name === node);
        const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node;
        const isKeyOrLabel =
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isMethodDeclaration(parent) && parent.name === node) ||
          (ts.isPropertyDeclaration(parent) && parent.name === node) ||
          (ts.isLabeledStatement(parent) && parent.label === node) ||
          (ts.isBreakStatement(parent) && parent.label === node) ||
          (ts.isContinueStatement(parent) && parent.label === node);
        if (!isDeclaration && !isPropertyName && !isKeyOrLabel) refs.add(node.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return [...refs].filter((r) => !declared.has(r) && !STANDARD_GLOBALS.has(r)).sort();
};

describe("buildPopupRuntimeScript", () => {
  it("emits one script element stamped with the popups runtime marker", () => {
    const script = buildPopupRuntimeScript();
    expect(script.startsWith("<script")).toBe(true);
    expect(script.endsWith("</script>")).toBe(true);
    expect(script).toContain(MARKER);
    expect(script.match(/<script/g)).toHaveLength(1);
  });

  it("emits every serialized helper as its own bound const", () => {
    const body = extractBody(buildPopupRuntimeScript());
    for (const name of SERIALIZED_CONSTS) {
      expect(body).toMatch(new RegExp(`^\\s*const ${name} = `, "m"));
    }
  });

  it("emitted body parses as JavaScript (guard a)", () => {
    const body = extractBody(buildPopupRuntimeScript());
    expect(() => {
      // eslint-disable-next-line no-new-func
      new Function(body);
    }).not.toThrow();
  });

  it("references no unbound identifier (guard b)", () => {
    const body = extractBody(buildPopupRuntimeScript());
    expect(findUnboundIdentifiers(body)).toEqual([]);
  });

  it("the guard catches a missing serialized helper const (SAFE)", () => {
    const body = extractBody(buildPopupRuntimeScript());
    expect(findUnboundIdentifiers(stripConst(body, "SAFE"))).toEqual(["SAFE"]);
  });

  it("the guard catches a missing engine helper const (sameUtcDay)", () => {
    const body = extractBody(buildPopupRuntimeScript());
    expect(findUnboundIdentifiers(stripConst(body, "sameUtcDay"))).toEqual(["sameUtcDay"]);
  });

  it("the guard catches a missing watcher helper const (scrollDepthPercent)", () => {
    const body = extractBody(buildPopupRuntimeScript());
    expect(findUnboundIdentifiers(stripConst(body, "scrollDepthPercent"))).toEqual([
      "scrollDepthPercent",
    ]);
  });

  it("is memoized: repeated builds return the identical string", () => {
    expect(buildPopupRuntimeScript()).toBe(buildPopupRuntimeScript());
    expect(buildPopupRuntimeScript().length).toBeGreaterThan(1000);
  });
});

describe("injectPopupRuntime", () => {
  it("injects the script immediately before the final </body>", () => {
    const html = "<!doctype html><html><head></head><body><p>hi</p></body></html>";
    const out = injectPopupRuntime(html);
    expect(out).toContain(MARKER);
    const scriptIndex = out.indexOf(`<script ${MARKER}`);
    const bodyIndex = out.lastIndexOf("</body>");
    expect(scriptIndex).toBeGreaterThan(0);
    expect(bodyIndex).toBeGreaterThan(scriptIndex);
    expect(out.slice(scriptIndex, bodyIndex)).toMatch(/<\/script>\s*$/);
    expect(out.match(new RegExp(MARKER, "g"))).toHaveLength(1);
  });

  it("appends the script when the document has no </body>", () => {
    const partial = "<html><body><p>streamed</p>";
    const out = injectPopupRuntime(partial);
    expect(out).toBe(partial + buildPopupRuntimeScript());
  });

  it("is a pure function: identical input yields identical output", () => {
    const html = "<html><body>x</body></html>";
    expect(injectPopupRuntime(html)).toBe(injectPopupRuntime(html));
  });
});

describe("bootstrap smoke in happy-dom", () => {
  it("boots the runtime and stamps the re-entry flag without throwing", async () => {
    const { Window } = await import("happy-dom");
    const win = new Window({ url: "https://example.test/about" });
    const fetchStub = async () => ({ ok: true, json: async () => ({ items: [] }) });
    const body = extractBody(buildPopupRuntimeScript());
    // Inject the happy-dom window/document/storage/location/fetch as params so
    // the IIFE runs against a real DOM without global stubbing (repo pattern).
    expect(() => {
      // eslint-disable-next-line no-new-func
      new Function(
        "window",
        "document",
        "sessionStorage",
        "localStorage",
        "location",
        "fetch",
        body
      )(win, win.document, win.sessionStorage, win.localStorage, win.location, fetchStub);
    }).not.toThrow();
    expect((win as unknown as { __codersoPopupRuntime?: boolean }).__codersoPopupRuntime).toBe(
      true
    );
  });
});
