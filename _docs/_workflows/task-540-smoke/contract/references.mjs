import { deepFreezeExact, exactKeys, invariant, valueAtPath } from "./core.mjs";
import { SCREENSHOT_DESCRIPTOR_BY_ACTION_ID } from "./metadata.mjs";

export function parseBuilderAst(builder) {
  invariant(typeof builder === "string" && builder.length > 0, "builder must be non-empty");
  const open = builder.indexOf("(");
  if (open === -1) {
    invariant(/^[A-Za-z][A-Za-z0-9-]*$/.test(builder), "bare builder name is invalid");
    return deepFreezeExact({ callee: builder, args: [] });
  }
  invariant(builder.endsWith(")"), "builder call must close");
  const callee = builder.slice(0, open);
  invariant(/^[A-Za-z][A-Za-z0-9-]*$/.test(callee), "builder callee is invalid");
  const body = builder.slice(open + 1, -1);
  const args = [];
  let quote = null;
  let escaped = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote !== null) {
      if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") {
      invariant(depth > 0, "builder has an unmatched close parenthesis");
      depth -= 1;
    } else if (character === "," && depth === 0) {
      args.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  invariant(quote === null && depth === 0, "builder expression is unterminated");
  if (body.trim().length > 0) args.push(body.slice(start).trim());
  invariant(
    args.every((argument) => argument.length > 0),
    "builder has an empty argument"
  );
  return deepFreezeExact({ callee, args });
}

export function parseBuilderKind(builder) {
  return parseBuilderAst(builder).callee;
}

export function literalRef(value) {
  return deepFreezeExact({ op: "literal", value });
}

export function compileArgumentRef(expression) {
  invariant(
    typeof expression === "string" && expression.length > 0 && expression.length <= 1024,
    "command argument expression is invalid"
  );
  if (expression.startsWith('"') && expression.endsWith('"')) {
    const value = JSON.parse(expression);
    invariant(typeof value === "string", "quoted command argument must be a string");
    return literalRef(value);
  }
  if (/^-?(?:0|[1-9][0-9]*)$/.test(expression)) return literalRef(Number(expression));
  if (expression === "$ADMIN_EMAIL" || expression === "$ADMIN_PASSWORD") {
    return deepFreezeExact({ op: "secret", name: expression.slice(1) });
  }
  if (expression === "$WF540_USER_A_EMAIL") {
    return deepFreezeExact({ op: "fixture", path: ["users", "a", "email"] });
  }
  if (expression === "$WF540_USER_B_EMAIL") {
    return deepFreezeExact({ op: "fixture", path: ["users", "b", "email"] });
  }
  invariant(!expression.startsWith("$"), "command secret reference is not allowlisted");
  if (expression.startsWith("paths.")) {
    const key = expression.slice("paths.".length);
    invariant(/^[A-Za-z][A-Za-z0-9]*$/.test(key), "command path key is invalid");
    return deepFreezeExact({ op: "path", key });
  }
  if (expression.startsWith("S.")) {
    const selectorAst = parseBuilderAst(expression.slice(2));
    return deepFreezeExact({
      op: "selector",
      templateId: selectorAst.callee,
      args: selectorAst.args.map(compileArgumentRef),
    });
  }
  if (expression.startsWith("screen.blockIds.")) {
    return deepFreezeExact({
      op: "fixture",
      path: ["screen", "blockIds", expression.slice("screen.blockIds.".length)],
    });
  }
  const captureAliases = {
    "palette.button": "palette.button",
    "palette.image": "palette.image",
    "palette.mediaField": "palette.media-field",
    "palette.outerTabs": "palette.outer-tabs",
    "palette.tabOneText": "palette.tab-one-text",
    "palette.tabTwoText": "palette.tab-two-text",
    "palette.tabThreeText": "palette.tab-three-text",
    "palette.innerTabs": "palette.inner-tabs",
    "palette.dirtyText": "palette.dirty-text",
    "screen.id": "screen.id",
    "entry.id": "entry.id",
  };
  if (Object.hasOwn(captureAliases, expression)) {
    return deepFreezeExact({ op: "capture", name: captureAliases[expression] });
  }
  const fixturePrefixes = ["entry.", "media.", "relatedEntries.", "tabs.", "users."];
  if (fixturePrefixes.some((prefix) => expression.startsWith(prefix))) {
    const path = expression.split(".");
    invariant(
      path.every((segment) => /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(segment)),
      "fixture command path is invalid"
    );
    return deepFreezeExact({ op: "fixture", path });
  }
  invariant(
    expression.length <= 240 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(expression),
    "literal command token is invalid"
  );
  return literalRef(expression);
}


export function validateRefDescriptor(ref, context, label, depth = 0, allowSecret = false) {
  invariant(depth <= 32, label + " exceeds the Ref nesting limit");
  invariant(ref && typeof ref === "object" && !Array.isArray(ref), label + " must be a Ref");
  invariant(typeof ref.op === "string", label + " Ref opcode is missing");
  if (ref.op === "literal") {
    exactKeys(ref, ["op", "value"], label);
    invariant(
      Number.isSafeInteger(ref.value) ||
        (typeof ref.value === "string" &&
          ref.value.length <= 4096 &&
          !/[\0\r\n]/u.test(ref.value) &&
          !ref.value.startsWith("$") &&
          !["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(ref.value)),
      label + " literal must be a string or safe integer"
    );
    return;
  }
  if (ref.op === "secret") {
    exactKeys(ref, ["op", "name"], label);
    invariant(allowSecret, label + " secret is not permitted in this position");
    invariant(
      ["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(ref.name),
      label + " secret is not allowlisted"
    );
    return;
  }
  if (ref.op === "capture") {
    exactKeys(ref, ["op", "name"], label);
    invariant(context.captureNames.includes(ref.name), label + " capture is not registered");
    return;
  }
  if (ref.op === "fixture") {
    exactKeys(ref, ["op", "path"], label);
    invariant(
      Array.isArray(ref.path) &&
        ref.path.length > 0 &&
        ref.path.length <= 4 &&
        ref.path.every(
          (segment) => typeof segment === "string" && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(segment)
        ) &&
        context.fixtureRefPaths.includes(ref.path.join(".")),
      label + " fixture path is invalid"
    );
    const resolved = valueAtPath(context.fixtureBlueprint, ref.path, label);
    invariant(
      typeof resolved === "string" || Number.isSafeInteger(resolved),
      label + " fixture path must resolve to a scalar leaf"
    );
    return;
  }
  if (ref.op === "path") {
    exactKeys(ref, ["op", "key"], label);
    invariant(
      Object.hasOwn(context.fixtureBlueprint.paths, ref.key),
      label + " path is not registered"
    );
    return;
  }
  if (ref.op === "selector") {
    exactKeys(ref, ["op", "templateId", "args"], label);
    const selector = context.selectors[ref.templateId];
    invariant(selector !== undefined, label + " selector is not registered");
    invariant(
      Array.isArray(ref.args) &&
        ref.args.length >= selector.minArity &&
        ref.args.length <= selector.maxArity,
      label + " selector arity drift"
    );
    ref.args.forEach((argument, index) =>
      validateRefDescriptor(argument, context, label + ".args[" + index + "]", depth + 1, false)
    );
    return;
  }
  invariant(false, label + " has an unknown Ref opcode");
}

export function captureNamesRequiredByRef(ref, context, output = []) {
  if (ref.op === "capture") output.push(ref.name);
  if (ref.op === "path") {
    const pathDescriptor = context.fixtureBlueprint.paths[ref.key];
    if (pathDescriptor && typeof pathDescriptor === "object") {
      for (const captureName of pathDescriptor.captures) output.push(captureName);
    }
  }
  if (ref.op === "selector") {
    for (const argument of ref.args) {
      captureNamesRequiredByRef(argument, context, output);
    }
  }
  return output;
}

export function repositoryMutationPolicy(action, ast) {
  if (action.kind !== "screen") {
    return deepFreezeExact({ mode: "none", paths: [] });
  }
  const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
  invariant(descriptor !== undefined, action.id + " screenshot descriptor is not registered");
  invariant(ast.args.length === 1, action.id + " screenshot builder arity drift");
  const screenshotRef = compileArgumentRef(ast.args[0]);
  invariant(
    screenshotRef.op === "literal" && typeof screenshotRef.value === "string",
    action.id + " screenshot name must be literal"
  );
  const screenshotName = screenshotRef.value;
  invariant(
    descriptor.path === "_docs/_workflows/_smoke/task-540-wf540smoke-" + screenshotName + ".png",
    action.id + " screenshot builder/path identity drift"
  );
  return deepFreezeExact({ mode: "allowlist", paths: [descriptor.path] });
}

export function parseAssertionName(builder) {
  const match = /^assert\(([^()]+)\)$/.exec(builder);
  return match?.[1] ?? null;
}

export function collectTaggedReferences(value, key, output = []) {
  if (!value || typeof value !== "object") return output;
  const keys = Reflect.ownKeys(value);
  if (keys.includes(key) && typeof value[key] === "string") output.push(value[key]);
  for (const childKey of keys) {
    if (childKey !== key) collectTaggedReferences(value[childKey], key, output);
  }
  return output;
}

export function executableRefs(executable) {
  return Object.hasOwn(executable, "refs") ? executable.refs : [];
}

export function collectRefDescriptors(ref, output = []) {
  output.push(ref);
  if (ref.op === "selector") {
    ref.args.forEach((item) => collectRefDescriptors(item, output));
  }
  return output;
}
