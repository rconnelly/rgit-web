/** Small markdown subset for README and request bodies (Zola-like). */
export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  const fences: string[] = [];
  let html = escaped.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const idx = fences.length;
    fences.push(`<pre><code>${code.trim()}</code></pre>`);
    return `\u0000FENCE${idx}\u0000`;
  });
  html = html
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^\> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^(?:[-*] .+(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^[-*] /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });
  html = html
    .split(/\n{2,}/)
    .map((para) => {
      if (para.startsWith("<")) return para;
      return `<p>${para.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
  html = html.replace(/\u0000FENCE(\d+)\u0000/g, (_m, idx) => fences[Number(idx)] ?? "");
  return html;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
