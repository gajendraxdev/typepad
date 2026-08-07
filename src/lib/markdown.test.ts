import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings and emphasis", () => {
    const html = renderMarkdown("# Hello\n\n**bold** text");
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("returns empty for blank input", () => {
    expect(renderMarkdown("   ")).toBe("");
  });

  it("strips event-handler attributes from raw HTML", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><p>ok</p>');
    expect(html.toLowerCase()).not.toContain("onerror");
    expect(html).toContain("ok");
  });
});
