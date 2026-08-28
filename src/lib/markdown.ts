function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u) || u.startsWith("#") || u.startsWith("/")) return u;
  return null;
}

function inline(src: string): string {
  let out = escapeHtml(src);
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeHref(url);
    if (!href) return label;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(.,:;!?])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(.,:;!?])_([^_\n]+)_/g, "$1<em>$2</em>");
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? "");
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  const flushList = (ordered: boolean) => {
    const items: string[] = [];
    const re = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
    while (i < lines.length && re.test(lines[i])) {
      items.push(`<li>${inline(lines[i].match(re)![1])}</li>`);
      i++;
    }
    html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      i++;
      const body: string[] = [];
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
      html.push(`<pre><code${lang}>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      html.push("<hr />");
      i++;
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushList(false);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushList(true);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|#{1,3}\s|>\s?|[-*]\s|\d+\.\s|---\s*$)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(para.join("\n")).replace(/\n/g, "<br />")}</p>`);
  }

  return html.join("\n");
}
