import fs from "node:fs";
import path from "node:path";

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const slug = (text) => text.toLowerCase().replace(/[`*]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Deliberately small Markdown subset, documented in maintenance.md. It handles
// headings, paragraphs, lists, tables, fenced code/flows, images and links. All
// raw content is escaped; unsupported HTML cannot become executable markup.
export function renderMarkdown(markdown, { root, file, id, sections }) {
  const links = [];
  const headings = [];
  const seen = new Set();
  function destination(href, image = false) {
    if (/^https?:\/\//.test(href)) {
      if (image) throw new Error(`Remote images would break offline use: ${href}`);
      return href;
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) throw new Error(`Unsupported link scheme: ${href}`);
    const [pathname, fragment] = href.split("#");
    if (!pathname) {
      const target = `#${id}--${fragment}`;
      links.push(target);
      return target;
    }
    const resolved = path.resolve(root, "docs", path.dirname(file), decodeURIComponent(pathname));
    const relative = path.relative(root, resolved).replaceAll("\\", "/");
    if (relative.startsWith("../") || path.isAbsolute(relative)) throw new Error(`Link escapes repository: ${href}`);
    if (image) {
      if (!fs.existsSync(resolved)) throw new Error(`Missing image: ${relative}`);
      const extension = path.extname(resolved).toLowerCase();
      const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" }[extension];
      if (!mime) throw new Error(`Unsupported image: ${relative}`);
      return `data:${mime};base64,${fs.readFileSync(resolved).toString("base64")}`;
    }
    const section = sections.find((s) => `docs/${s.file}` === relative);
    if (section) {
      const target = `#${section.id}${fragment ? `--${fragment}` : ""}`;
      links.push(target);
      return target;
    }
    if (!fs.existsSync(resolved)) throw new Error(`Broken link in ${file}: ${href}`);
    return "../" + relative.split("/").map(encodeURIComponent).join("/") + (fragment ? `#${fragment}` : "");
  }
  function inline(text) {
    const tokens = [];
    const save = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
    // Protect code before parsing links or emphasis.
    let output = text.replace(/`([^`]+)`/g, (_, value) => save(`<code>${escapeHtml(value)}</code>`));
    output = output.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, href) => save(`<img src="${escapeHtml(destination(href, true))}" alt="${escapeHtml(alt)}" loading="lazy">`));
    output = output.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => save(`<a href="${escapeHtml(destination(href))}">${escapeHtml(label)}</a>`));
    output = escapeHtml(output).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Restore recursively because a linked label can contain a protected code span.
    for (let i = 0; i < 3; i++) output = output.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
    return output;
  }
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const special = (line) => /^(#{1,6} |```|\| |[-*] |\d+\. |>|---$)/.test(line);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      if (i === lines.length) throw new Error(`Unclosed code fence in ${file}`);
      i++;
      if (language === "flow") html.push(`<ol class="flow" aria-label="Workflow steps">${code.filter(Boolean).map((step) => `<li>${inline(step)}</li>`).join("")}</ol>`);
      else html.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) {
      const anchor = `${id}--${slug(heading[2])}`;
      if (seen.has(anchor)) throw new Error(`Duplicate heading ${anchor} in ${file}`);
      seen.add(anchor);
      const level = Math.min(heading[1].length + 1, 6);
      headings.push({ id: anchor, title: heading[2], level });
      html.push(`<h${level} id="${anchor}">${inline(heading[2])}<a class="permalink" href="#${anchor}" aria-label="Link to ${escapeHtml(heading[2])}">#</a></h${level}>`);
      i++; continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll("\\|", "|")));
      if (rows.length < 2 || !rows[1].every((cell) => /^:?-+:?$/.test(cell))) throw new Error(`Table must have a header separator in ${file}`);
      if (rows.some((row) => row.length !== rows[0].length)) throw new Error(`Mismatched table cells in ${file}`);
      html.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(rows[0].join(", "))}"><table><thead><tr>${rows[0].map((cell) => `<th scope="col">${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^[-*] |^\d+\. /.test(line)) {
      const ordered = /^\d/.test(line);
      const pattern = ordered ? /^\d+\. / : /^[-*] /;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(inline(lines[i++].replace(pattern, "")));
      html.push(`<${ordered ? "ol" : "ul"}>${items.map((item) => `<li>${item}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (line.startsWith(">")) { html.push(`<blockquote>${inline(line.replace(/^> ?/, ""))}</blockquote>`); i++; continue; }
    if (line === "---") { html.push("<hr>"); i++; continue; }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !special(lines[i])) paragraph.push(lines[i++]);
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  return { html: html.join("\n"), links, headings };
}
