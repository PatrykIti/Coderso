import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { renderPostRichTextHtml } from "../../../core/services/posts/runtime/postRichTextReactRenderer";

test("renderPostRichTextHtml renders allowed formatting as React nodes", () => {
  const html = renderToString(
    <div>
      {renderPostRichTextHtml(
        `<p>Hello <strong>world</strong> <a href="/safe" target="_blank">link</a></p>`
      )}
    </div>
  );

  expect(html).toContain("<strong>world</strong>");
  expect(html).toContain('href="/safe"');
  expect(html).toContain('rel="noopener noreferrer nofollow"');
});

test("renderPostRichTextHtml strips scripts, event handlers, and unsafe urls", () => {
  const html = renderToString(
    <div>
      {renderPostRichTextHtml(
        `<p onclick="evil()">Hello<script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src="javascript:alert(1)" onerror="evil()"></p>`
      )}
    </div>
  );

  expect(html).toContain("Hello");
  expect(html).toContain('href="#"');
  expect(html).not.toContain("script");
  expect(html).not.toContain("onclick");
  expect(html).not.toContain("onerror");
  expect(html).not.toContain("javascript:alert");
});
