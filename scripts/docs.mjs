import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groups, sections, trackedRoots, trackedFiles } from "../docs/config.mjs";
import { operations, pages } from "../docs/catalog.mjs";
import { read, hash, sourceState, changedSources } from "./docs/source.mjs";
import { generate } from "./docs/generate.mjs";
import { renderMarkdown, escapeHtml } from "./docs/markdown.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
const stateFile = path.join(root, "docs/review-state.json");
function write(file, content) {
  const target = path.join(root, "docs", file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}
function assertReviewed(state) {
  const reviewed = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
  const errors = [];
  for (const [id, sources] of Object.entries(state)) {
    const changes = changedSources(reviewed[id]?.sources, sources);
    if (changes.length) errors.push(`${id} (${groups[id].file}):\n  ${changes.join("\n  ")}`);
    if (reviewed[id] && !reviewed[id].note?.trim()) errors.push(`${id}: missing review explanation.`);
  }
  if (errors.length) throw new Error(`Documentation review required:\n${errors.join("\n")}\nUpdate affected guides and catalog, then acknowledge each group with npm run docs:review -- <group> --note "what was checked or changed". Generating files does not acknowledge review.`);
}
function build(generated, state) {
  const compiled = sections.map((section) => {
    const content = generated.files[section.file] ?? read(root, `docs/${section.file}`);
    return { ...section, ...renderMarkdown(content, { root, file: section.file, id: section.id, sections }) };
  });
  const ids = new Set(compiled.flatMap((s) => [s.id, ...s.headings.map((h) => h.id)]));
  for (const section of compiled) for (const link of section.links) if (!ids.has(link.slice(1))) throw new Error(`Broken heading link ${link} in ${section.file}`);
  const contentRevision = hash(JSON.stringify(state)).slice(0, 16);
  const version = JSON.parse(read(root, "package.json")).version;
  const nav = compiled.map((s, i) => `${i === 0 ? '<p class="nav-label">User handbook</p>' : s.id === "navigation" ? '<p class="nav-label">Reference</p>' : ""}<a href="#${s.id}">${escapeHtml(s.title)}</a>`).join("\n");
  const css = read(root, "docs/handbook.css");
  const script = read(root, "docs/handbook.js");
  if (/<\/script/i.test(script) || /<\/style/i.test(css)) throw new Error("Unsafe inline asset delimiter.");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="HLUSCA application handbook: role guides, savings, loans, repayments, investments, dividends, permissions and API reference."><title>HLUSCA · Application handbook</title><style>${css}</style></head>
<body><a class="skip" href="#main">Skip to handbook</a>
<aside class="sidebar" id="contents"><p class="brand">HLUSCA<span>.</span></p><p class="edition">Application handbook</p><nav aria-label="Handbook contents">${nav}</nav><p class="rail-note">A practical guide to the cooperative.<br>Works offline · Print to PDF<br>Application v${escapeHtml(version)}</p></aside>
<div class="shell"><div class="toolbar" role="search" aria-label="Search handbook"><button type="button" class="menu-toggle" id="menu-toggle" aria-label="Open contents" aria-controls="contents" aria-expanded="false">☰</button><div class="search-box"><label for="search">Find a task or endpoint</label><input id="search" type="search" placeholder="Try “disburse”, “dividends” or “403”" autocomplete="off"></div><div class="audience-box"><label for="audience">Guide audience</label><select id="audience"><option value="all">All readers</option><option value="CLIENT">Member</option><option value="TREASURER">Treasurer</option><option value="BOARD">Board</option><option value="ADMIN">Administrator</option><option value="technical">Developer / operator</option></select></div><button type="button" data-clear>Clear</button><button type="button" id="print">Print<span class="print-label"> / Save PDF</span></button></div><p class="status" id="result-status" role="status" aria-live="polite"></p>
<main id="main"><noscript><p class="no-js">All documentation is available below. Enable JavaScript for search and audience filtering, or use your browser's Find command.</p></noscript><header class="hero"><p class="eyebrow">Savings · Loans · Investments</p><h1>Your guide to<br>working with HLUSCA.</h1><p class="intro">Follow the task from the first click to the final confirmation. Find the right screen, understand who can act, and see what changes when an action succeeds.</p><div class="stats"><div class="stat"><strong>4</strong><span>Application roles</span></div><div class="stat"><strong>${generated.facts.counts.pages}</strong><span>Pages & redirects</span></div><div class="stat"><strong>${generated.facts.counts.operations}</strong><span>HTTP operations</span></div></div><div class="quick-start"><a href="#members">Administrator<small>Enroll & configure</small></a><a href="#savings">Treasurer<small>Savings & receipts</small></a><a href="#loans">Member<small>Apply & follow a loan</small></a><a href="#investments">Board<small>Review & decide</small></a></div><p class="version">Application v${escapeHtml(version)} · Documented source ${contentRevision} · Source snapshot, including local changes at generation; deployment status is not inferred.</p></header>
<div id="empty-state" class="empty" hidden><h2>No matching topics</h2><p>Try fewer words, an endpoint name, or choose All readers.</p><button type="button" data-clear>Clear search and filters</button></div>
${compiled.map((s) => `<article id="${s.id}" data-audience="${s.audience}"><div class="article-meta">${s.audience === "technical" ? "Technical reference" : "Application guide"}</div>${s.html.split(/(?=<h[23] )/).filter(Boolean).map((chunk) => `<div class="topic">${chunk}</div>`).join("\n")}</article>`).join("\n")}
<footer>HLUSCA application handbook · Source ${contentRevision} · Generated from version-controlled Markdown and application code. Application records and credentials in examples are synthetic placeholders.</footer></main></div><script>${script}</script></body></html>\n`;
}

try {
  if (!["generate", "build", "check", "review"].includes(mode)) throw new Error("Usage: node scripts/docs.mjs generate|build|check|review [group ...] --note \"review explanation\"");
  const state = sourceState(root, groups, trackedRoots, trackedFiles);
  if (mode === "review") {
    const args = process.argv.slice(3);
    const noteIndex = args.indexOf("--note");
    const note = noteIndex >= 0 ? args[noteIndex + 1] : "";
    if (!note || note.trim().length < 15 || noteIndex + 2 !== args.length) throw new Error("Supply a meaningful --note (at least 15 characters) after the reviewed group IDs.");
    const selected = args.slice(0, noteIndex);
    const selectedGroups = selected.includes("--all") ? Object.keys(groups) : selected;
    if (!selectedGroups.length || selectedGroups.some((id) => !groups[id])) throw new Error(`Choose review groups: ${Object.keys(groups).join(", ")}, or --all.`);
    const reviewed = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
    for (const id of selectedGroups) reviewed[id] = { note: note.trim(), sources: state[id] };
    write("review-state.json", JSON.stringify(reviewed, null, 2) + "\n");
    console.log(`Acknowledged documentation review: ${selectedGroups.join(", ")}.`);
  } else {
    const generated = generate(root, operations, pages);
    if (mode === "generate") {
      for (const [file, content] of Object.entries(generated.files)) write(file, content);
      console.log(`Generated ${generated.facts.counts.operations} operations, ${generated.facts.counts.pages} pages and ${generated.facts.navigation.length} menu entries.`);
    } else {
      assertReviewed(state);
      const html = build(generated, state);
      if (mode === "build") {
        for (const [file, content] of Object.entries(generated.files)) write(file, content);
        write("index.html", html);
        console.log(`Built docs/index.html (${Math.round(Buffer.byteLength(html) / 1024)} KB). All assets embedded; no server or database needed.`);
      } else {
        const stale = Object.entries({ ...generated.files, "index.html": html }).filter(([file, content]) => !fs.existsSync(path.join(root, "docs", file)) || read(root, `docs/${file}`) !== content).map(([file]) => file);
        if (stale.length) throw new Error(`Stale documentation artifacts: ${stale.join(", ")}. Run npm run docs:generate and npm run docs:build, then commit the refreshed files.`);
        console.log(`Documentation checks passed: ${generated.facts.counts.operations} operations, ${generated.facts.counts.pages} pages, source reviews, generated content and all internal links.`);
      }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
