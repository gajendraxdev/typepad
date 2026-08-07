import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

/** Render note text as safe HTML for read-only preview. */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return "";
  const raw = marked.parse(source, { async: false }) as string;
  // Strip scripts/event handlers before dangerouslySetInnerHTML.
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
