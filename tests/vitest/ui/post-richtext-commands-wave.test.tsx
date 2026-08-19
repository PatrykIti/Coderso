// @vitest-environment happy-dom

import React, { useState } from "react";
import { test, expect, vi } from "vitest";
import {
  mount,
  getEditor,
  clickByText,
  dispatchEditorEvent,
  setSelectionAtEnd,
  findTextNode,
  setRangeSelection,
  setCollapsedSelection,
  flush,
} from "./postRichTextAdapterFixtures";
import {
  PostRichTextAdapter,
  buildPostRichTextPasteInsert,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("PostRichTextAdapter routes toolbar fallback callbacks and keyboard shortcuts", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onChangeSpy = vi.fn();
  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("<p>Hello</p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        onFontFamilyChange={onFontFamilyChange}
        onBaseTextScaleChange={onBaseTextScaleChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    clickByText(view.container, "font-serif");
    clickByText(view.container, "scale-lg");

    expect(onFontFamilyChange).toHaveBeenCalledWith("serif");
    expect(onBaseTextScaleChange).toHaveBeenCalledWith("lg");

    React.act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          ctrlKey: true,
          bubbles: true,
        })
      );
    });

    expect(execCommand).toHaveBeenCalledWith("defaultParagraphSeparator", false, "p");
    expect(execCommand).toHaveBeenCalledWith("bold", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter routes native-inline and link commands", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalPrompt = window.prompt;
  const prompt = vi
    .fn()
    .mockReturnValueOnce("https://example.com")
    .mockReturnValueOnce("Example link")
    .mockReturnValueOnce("https://example.com/selected")
    .mockReturnValueOnce("   ")
    .mockReturnValueOnce("javascript:alert(1)");
  Object.defineProperty(window, "prompt", {
    value: prompt,
    configurable: true,
    writable: true,
  });

  const unsafeLinkAttempt = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState("<p>Link target</p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onUnsafeLinkAttempt={unsafeLinkAttempt}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);

    clickByText(view.container, "italic");
    clickByText(view.container, "underline");
    clickByText(view.container, "strike");

    const linkNode = findTextNode(editor, "Link");
    setCollapsedSelection(linkNode, 1);
    clickByText(view.container, "link");

    const targetNode = findTextNode(editor, "target");
    setRangeSelection(targetNode, 0, targetNode, targetNode.nodeValue?.length ?? 6);
    clickByText(view.container, "link");
    clickByText(view.container, "link");
    setRangeSelection(targetNode, 0, targetNode, targetNode.nodeValue?.length ?? 6);
    clickByText(view.container, "link");

    expect(execCommand).toHaveBeenCalledWith("italic", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("underline", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("strikeThrough", false, undefined);
    expect(execCommand).toHaveBeenCalledWith(
      "insertHTML",
      false,
      '<a href="https://example.com">Example link</a>'
    );
    expect(execCommand).toHaveBeenCalledWith("createLink", false, "https://example.com/selected");
    expect(execCommand).toHaveBeenCalledWith("unlink", false, undefined);
    expect(unsafeLinkAttempt).toHaveBeenCalledWith("javascript:alert(1)");
    expect(execCommand).toHaveBeenCalledWith("createLink", false, "#");
  } finally {
    Object.defineProperty(window, "prompt", {
      value: originalPrompt,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("PostRichTextAdapter applies inline typography to selection and reuses typography spans", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha <strong>Beta</strong></p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onFontFamilyChange={onFontFamilyChange}
        onBaseTextScaleChange={onBaseTextScaleChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const alphaNode = findTextNode(editor, "Alpha");
    const betaNode = findTextNode(editor, "Beta");
    setRangeSelection(alphaNode, 0, betaNode, betaNode.nodeValue?.length ?? 4);

    clickByText(view.container, "font-serif");
    await flush();

    const selectedSpan = editor.querySelector('span[data-font="serif"]');
    expect(selectedSpan).not.toBeNull();

    const serifNode = findTextNode(editor, "Alpha");
    setRangeSelection(serifNode, 0, serifNode, serifNode.nodeValue?.length ?? 5);

    clickByText(view.container, "scale-lg");
    await flush();

    expect(onFontFamilyChange).not.toHaveBeenCalled();
    expect(onBaseTextScaleChange).not.toHaveBeenCalled();
    expect(editor.innerHTML).toContain('data-font="serif"');
    expect(editor.innerHTML).toContain('data-text-scale="lg"');
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter falls back for block commands without block wrappers", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const HeadingHarness = () => {
    const [value, setValue] = useState("Loose text");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const headingView = mount(<HeadingHarness />);

  try {
    const editor = getEditor(headingView.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(headingView.container, "heading-1");
    await flush();
    expect(editor.innerHTML).toContain("<h1>Loose text</h1>");

    React.act(() => {
      editor.innerHTML = "Loose text";
      setSelectionAtEnd(editor);
    });
    clickByText(headingView.container, "clear-formatting");
    await flush();

    expect(editor.innerHTML).toContain("<p>Loose text</p>");
  } finally {
    headingView.cleanup();
  }
});

test("PostRichTextAdapter wraps collapsed caret tokens with highlight and inline code", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Gamma Delta</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const initialNode = findTextNode(editor, "Gamma Delta");
    setCollapsedSelection(initialNode, 1);
    clickByText(view.container, "inline-code");
    await flush();

    expect(editor.innerHTML).toContain("<code>Gamma</code>");

    const deltaNode = findTextNode(editor, "Delta");
    setCollapsedSelection(deltaNode, 1);
    clickByText(view.container, "highlight");
    await flush();

    expect(editor.innerHTML).toContain("<mark>Delta</mark>");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter applies block alignment and clears formatting for selected blocks", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState(
      '<p data-align="right"><span data-font="serif"><mark>Styled</mark></span></p>'
    );
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const styledNode = findTextNode(editor, "Styled");
    setRangeSelection(styledNode, 0, styledNode, styledNode.nodeValue?.length ?? 6);

    clickByText(view.container, "align-center");
    await flush();
    expect(editor.innerHTML).toContain('data-align="center"');

    clickByText(view.container, "clear-formatting");
    await flush();

    expect(execCommand).toHaveBeenCalledWith("removeFormat", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("unlink", false, undefined);
    expect(editor.innerHTML).not.toContain("data-align");
    expect(editor.innerHTML).not.toContain("data-font");
    expect(editor.innerHTML).not.toContain("<mark");
    expect(editor.innerHTML).toContain("<p>Styled</p>");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter routes type commands through onBlockTypeChange and exposes multi-warning paste insert diagnostics", async () => {
  const onBlockTypeChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState("<p>Section text</p>");
    return (
      <PostRichTextAdapter
        value={value}
        onChange={setValue}
        onBlockTypeChange={onBlockTypeChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    clickByText(view.container, "type-section");
    clickByText(view.container, "type-heading");
    clickByText(view.container, "type-quote");

    expect(onBlockTypeChange.mock.calls).toEqual([
      ["writing-canvas", undefined],
      ["heading", { level: 2 }],
      ["quote", undefined],
    ]);
  } finally {
    view.cleanup();
  }

  const pasteInsert = buildPostRichTextPasteInsert({
    html: `
      <p class="MsoHeading1" style="mso-outline-level:1">Table of contents</p>
      <p><a href="#_Toc100">1. Intro 1</a></p>
      <p><a href="#_Toc200">2. Setup 3</a></p>
      <p><a href="#_Toc300">3. Output 5</a></p>
      <table><tr><td>unsupported</td></tr></table>
      <p>Body</p>
    `,
    text: "",
  });

  expect(pasteInsert.mode).toBe("writing-canvas");
  expect(pasteInsert.directives.replaceWordTocWithDynamicToc).toBe(true);
  expect(pasteInsert.warnings.length).toBeGreaterThan(1);
  expect(pasteInsert.warnings.some((warning) => warning.includes("Unsupported HTML markup"))).toBe(
    true
  );
  expect(pasteInsert.warnings.some((warning) => warning.includes("dynamic TOC"))).toBe(true);
});

test("PostRichTextAdapter applies placeholder and editor typography classes for serif and mono scales", async () => {
  const serifView = mount(
    <PostRichTextAdapter
      value=""
      onChange={() => undefined}
      fontFamily="serif"
      baseTextScale="xl"
    />
  );

  try {
    const placeholder = Array.from(serifView.container.querySelectorAll("div")).find(
      (candidate) =>
        candidate.textContent?.includes("Start writing") &&
        candidate.className.includes("pointer-events-none")
    ) as HTMLDivElement | null | undefined;
    const editor = getEditor(serifView.container);
    if (!placeholder || !editor) {
      throw new Error("missing serif editor nodes");
    }

    expect(placeholder.className).toContain("text-2xl");
    expect(placeholder.className).toContain("font-serif");
    expect(editor.className).toContain("text-2xl");
    expect(editor.className).toContain("font-serif");
  } finally {
    serifView.cleanup();
  }

  const monoView = mount(
    <PostRichTextAdapter value="" onChange={() => undefined} fontFamily="mono" baseTextScale="sm" />
  );

  try {
    const placeholder = Array.from(monoView.container.querySelectorAll("div")).find(
      (candidate) =>
        candidate.textContent?.includes("Start writing") &&
        candidate.className.includes("pointer-events-none")
    ) as HTMLDivElement | null | undefined;
    const editor = getEditor(monoView.container);
    if (!placeholder || !editor) {
      throw new Error("missing mono editor nodes");
    }

    expect(placeholder.className).toContain("text-base");
    expect(placeholder.className).toContain("font-mono");
    expect(editor.className).toContain("text-base");
    expect(editor.className).toContain("font-mono");
  } finally {
    monoView.cleanup();
  }
});

test("PostRichTextAdapter inserts paragraphs on Enter outside lists but leaves list Enter alone", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const alphaNode = findTextNode(editor, "Alpha");
    setCollapsedSelection(alphaNode, alphaNode.nodeValue?.length ?? 5);
    React.act(() => {
      editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(execCommand).toHaveBeenCalledWith("insertParagraph", false, undefined);

    execCommand.mockClear();
    React.act(() => {
      editor.innerHTML = "<ul><li>List item</li></ul>";
      const listNode = findTextNode(editor, "List item");
      setCollapsedSelection(listNode, listNode.nodeValue?.length ?? 9);
      editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(execCommand).not.toHaveBeenCalledWith("insertParagraph", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter wraps loose root content as a bullet list and falls back to native ordered-list commands", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("Loose text");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    clickByText(view.container, "bullet-list");
    await flush();
    expect(editor.innerHTML).toContain("<ul><li>Loose text</li></ul>");

    execCommand.mockClear();
    clickByText(view.container, "ordered-list");
    await flush();

    expect(execCommand).toHaveBeenCalledWith("insertOrderedList", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter resolves collapsed inline wrappers from element and trailing offsets", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p><strong>Gamma</strong> Delta</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");

    const strong = editor.querySelector("strong");
    if (!(strong instanceof HTMLElement)) {
      throw new Error("missing strong");
    }
    const selection = window.getSelection();
    const strongRange = document.createRange();
    strongRange.setStart(strong, 0);
    strongRange.setEnd(strong, 0);
    selection?.removeAllRanges();
    selection?.addRange(strongRange);
    document.dispatchEvent(new Event("selectionchange"));

    clickByText(view.container, "inline-code");
    await flush();
    expect(editor.innerHTML).toContain("<code>Gamma</code>");

    const paragraph = editor.querySelector("p");
    if (!(paragraph instanceof HTMLParagraphElement)) {
      throw new Error("missing paragraph");
    }
    const paragraphRange = document.createRange();
    paragraphRange.setStart(paragraph, paragraph.childNodes.length);
    paragraphRange.setEnd(paragraph, paragraph.childNodes.length);
    selection?.removeAllRanges();
    selection?.addRange(paragraphRange);
    document.dispatchEvent(new Event("selectionchange"));

    clickByText(view.container, "highlight");
    await flush();
    expect(editor.innerHTML).toContain("<mark>Delta</mark>");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter falls back to native list commands when no block selection is available", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Alpha</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    window.getSelection()?.removeAllRanges();

    clickByText(view.container, "bullet-list");
    clickByText(view.container, "ordered-list");

    expect(execCommand).toHaveBeenCalledWith("insertUnorderedList", false, undefined);
    expect(execCommand).toHaveBeenCalledWith("insertOrderedList", false, undefined);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextAdapter leaves link commands inert when the URL prompt is cancelled", async () => {
  const execCommand = vi.fn(() => false);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });

  const originalPrompt = window.prompt;
  Object.defineProperty(window, "prompt", {
    value: vi.fn(() => null),
    configurable: true,
    writable: true,
  });

  const Harness = () => {
    const [value, setValue] = useState("<p>Link target</p>");
    return <PostRichTextAdapter value={value} onChange={setValue} />;
  };

  const view = mount(<Harness />);

  try {
    const editor = getEditor(view.container);
    if (!editor) throw new Error("missing editor");

    dispatchEditorEvent(editor, "focus");
    setSelectionAtEnd(editor);
    execCommand.mockClear();

    clickByText(view.container, "link");

    expect(execCommand).not.toHaveBeenCalledWith(
      "insertHTML",
      expect.anything(),
      expect.anything()
    );
    expect(execCommand).not.toHaveBeenCalledWith(
      "createLink",
      expect.anything(),
      expect.anything()
    );
    expect(execCommand).not.toHaveBeenCalledWith("unlink", expect.anything(), expect.anything());
  } finally {
    Object.defineProperty(window, "prompt", {
      value: originalPrompt,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});
