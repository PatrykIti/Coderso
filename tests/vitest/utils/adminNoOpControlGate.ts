import { expect } from "vitest";

export type ControlExpectation =
  | {
      area: string;
      controlId: string;
      expected: "disabled";
      reasonPattern: RegExp;
      report: string;
    }
  | {
      area: string;
      controlId: string;
      expected: "hidden";
      report: string;
    };

const isDisabled = (element: Element) => {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.disabled;
  }
  return (
    element.getAttribute("aria-disabled") === "true" ||
    element.hasAttribute("data-disabled") ||
    element.getAttribute("data-state") === "disabled"
  );
};

const describeExpectation = (expectation: ControlExpectation) =>
  `${expectation.area} :: ${expectation.controlId} (${expectation.report})`;

export const expectNoOpControlExpectation = (root: ParentNode, expectation: ControlExpectation) => {
  const element = root.querySelector(`[data-no-op-control="${expectation.controlId}"]`);

  if (expectation.expected === "hidden") {
    expect(element, describeExpectation(expectation)).toBeNull();
    return;
  }

  expect(element, describeExpectation(expectation)).not.toBeNull();
  expect(isDisabled(element!), describeExpectation(expectation)).toBe(true);

  const reasonText = [
    element!.getAttribute("title"),
    element!.getAttribute("aria-label"),
    element!.textContent,
    (root as Element).textContent,
  ]
    .filter(Boolean)
    .join(" ");
  expect(reasonText, describeExpectation(expectation)).toMatch(expectation.reasonPattern);
};

export const expectNoOpControlExpectations = (
  root: ParentNode,
  expectations: ControlExpectation[]
) => {
  for (const expectation of expectations) {
    expectNoOpControlExpectation(root, expectation);
  }
};
