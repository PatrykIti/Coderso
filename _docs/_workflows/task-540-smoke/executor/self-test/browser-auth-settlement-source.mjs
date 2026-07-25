import { AUTH_SETTLEMENT_ACTION_IDS } from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export function inspectBrowserAuthSettlementSource({
  action,
  assertNegative,
  assertSourceMutantsRejected,
  authSettlementCompiledSources,
  authSettlementSourceSpecs,
  compiledSource,
  observedAuthSettlementActionIds,
}) {
  const authSettlementSourceSpec = authSettlementSourceSpecs.get(action.id);
  if (authSettlementSourceSpec !== undefined) {
    const expectedConfigNameToken =
      '"name":' + JSON.stringify(authSettlementSourceSpec.observationName);
    const finalUrlReadToken = "const observedUrl = page.url();";
    const labelTextReadToken = "await label.textContent({ timeout: remainingAuthTime() })";
    const menuBoxReadToken = "await menu.boundingBox({ timeout: remainingAuthTime() })";
    const menuVisibilityReadToken = "await menu.isVisible()";
    const urlGuardToken = "if (observedUrl !== config.adminRootUrl) {";
    const bindToken = "if (userId !== null) context.__wf540BindActiveUser";
    const returnToken = "return { url: observedUrl, userMenuVisible, userName };";
    const required = [
      '"adminRootUrl":"http://coderso-a.localhost:5173/admin/"',
      expectedConfigNameToken,
      "const deadline = Date.now() + 180000;",
      "const remainingAuthTime = () => {",
      "return Math.max(1, deadline - Date.now());",
      'let failureClass = "dom_read_failed";',
      "while (Date.now() < deadline)",
      "if (page.isClosed())",
      "const candidateUrl = page.url();",
      'candidateUrl === config.loginUrl ? "login_route" : "noncanonical_route"',
      "const menuCount = await menu.count();",
      'page.getByText("Loading...", { exact: true })',
      'failureClass = "menu_duplicate";',
      "const labelCount = await label.count();",
      'failureClass = "label_absent";',
      'failureClass = "label_duplicate";',
      "if (Object.values(result).some((item) => !Number.isFinite(item)))",
      labelTextReadToken,
      "const rawMenuRect = " + menuBoxReadToken + ";",
      "const menuRect = geometryIsFinite ? finiteRect(rawMenuRect) : null;",
      "const userMenuVisible = " + menuVisibilityReadToken + ";",
      "expectedName === null ? userName.length > 0 : userName === expectedName",
      'failureClass = "name_empty";',
      'failureClass = "name_mismatch";',
      'failureClass = "geometry_absent";',
      'failureClass = "geometry_nonfinite";',
      'failureClass = "geometry_nonpositive";',
      'failureClass = "menu_hidden";',
      finalUrlReadToken,
      urlGuardToken,
      'failureClass = "url_unstable";',
      bindToken,
      returnToken,
      "await page.waitForTimeout(Math.min(25, waitMs));",
      'failureClass = page.isClosed() ? "page_closed" : "dom_read_failed";',
      "break;",
      "const projection = context.__wf540ReadLogProjection();",
      'if (projection.firstUnexpected !== null) failureClass = "runtime_failure";',
      "return { settled: false, failureClass };",
      "const authSettlementFailureOutput = exactAuthSettlementFailureOutput(output);",
      "return { failureClass: value.failureClass, settled: false };",
      "if (authSettlementFailureOutput !== null) return authSettlementFailureOutput;",
      "output = exactOutput(output);",
      authSettlementSourceSpec.invocationToken,
    ];
    const validates = (source) => {
      const labelTextReadIndex = source.indexOf(labelTextReadToken);
      const menuBoxReadIndex = source.indexOf(menuBoxReadToken);
      const menuVisibilityReadIndex = source.indexOf(menuVisibilityReadToken);
      const finalUrlReadIndex = source.indexOf(finalUrlReadToken);
      const urlGuardIndex = source.indexOf(urlGuardToken);
      const bindIndex = source.indexOf(bindToken);
      const returnIndex = source.indexOf(returnToken);
      const failureEpilogIndex = source.indexOf(
        "if (authSettlementFailureOutput !== null) return authSettlementFailureOutput;"
      );
      const successEpilogIndex = source.indexOf("output = exactOutput(output);");
      const finalSettlementSource =
        finalUrlReadIndex >= 0 && returnIndex > finalUrlReadIndex
          ? source.slice(finalUrlReadIndex, returnIndex)
          : "";
      return (
        required.every((token) => source.includes(token)) &&
        !source.includes("const menu = await one(selector);") &&
        !source.includes("return { url: config.adminRootUrl, userMenuVisible, userName };") &&
        !source.includes(
          "const settled = { url: config.adminRootUrl, userMenuVisible, userName };"
        ) &&
        finalUrlReadIndex > labelTextReadIndex &&
        finalUrlReadIndex > menuBoxReadIndex &&
        finalUrlReadIndex > menuVisibilityReadIndex &&
        urlGuardIndex > finalUrlReadIndex &&
        bindIndex > urlGuardIndex &&
        returnIndex > bindIndex &&
        failureEpilogIndex > returnIndex &&
        successEpilogIndex > failureEpilogIndex &&
        !finalSettlementSource.includes("await ")
      );
    };
    invariant(validates(compiledSource), action.id + " auth settlement source contract drift");
    assertSourceMutantsRejected(
      compiledSource,
      validates,
      required,
      action.id + " auth settlement"
    );
    const constantUrlMutant = compiledSource.replace(
      returnToken,
      "return { url: config.adminRootUrl, userMenuVisible, userName };"
    );
    assertNegative(
      !validates(constantUrlMutant),
      action.id + " auth settlement constant URL return"
    );
    const missingFinalUrlReadMutant = compiledSource.replace(finalUrlReadToken, "");
    assertNegative(
      !validates(missingFinalUrlReadMutant),
      action.id + " auth settlement missing final URL read"
    );
    const earlyFinalUrlReadMutant = compiledSource
      .replace(finalUrlReadToken, "")
      .replace(labelTextReadToken, finalUrlReadToken + "\n            " + labelTextReadToken);
    assertNegative(
      !validates(earlyFinalUrlReadMutant),
      action.id + " auth settlement final URL read ordering"
    );
    const awaitedAfterFinalUrlReadMutant = compiledSource.replace(
      finalUrlReadToken,
      finalUrlReadToken + "\n              await page.waitForTimeout(0);"
    );
    assertNegative(
      !validates(awaitedAfterFinalUrlReadMutant),
      action.id + " auth settlement await after final URL read"
    );
    assertSourceMutantsRejected(
      compiledSource,
      validates,
      [expectedConfigNameToken, authSettlementSourceSpec.invocationToken],
      action.id + " auth settlement exact branch invocation"
    );
    observedAuthSettlementActionIds.push(action.id);
    authSettlementCompiledSources.set(action.id, compiledSource);
  }
}

export function assertBrowserAuthSettlementSourceOwnership({
  authSettlementActionIds,
  observedAuthSettlementActionIds,
}) {
  invariant(
    deepEqualJson(observedAuthSettlementActionIds, authSettlementActionIds),
    "auth realm settlement action ownership drift"
  );
  invariant(
    deepEqualJson(AUTH_SETTLEMENT_ACTION_IDS, authSettlementActionIds),
    "classified auth settlement action ownership drift"
  );
}
