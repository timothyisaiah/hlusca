import { inventory, read, roles, hash, parse } from "./source.mjs";
import ts from "typescript";

const roleNames = { CLIENT: "Member", TREASURER: "Treasurer", BOARD: "Board", ADMIN: "Administrator" };
const cell = (value) => String(value).replaceAll("|", "\\|").replace(/\s*\n\s*/g, " ");
const table = (headers, rows) => [headers, headers.map(() => "---"), ...rows].map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
const sourceLink = (file) => `[\`${file}\`](../../${file.split("/").map((part) => encodeURIComponent(part).replaceAll("(", "%28").replaceAll(")", "%29")).join("/")})`;
const endpointAnchor = (key) => key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function combineOperation(route, metadata) {
  if (!metadata) throw new Error(`Undocumented operation: ${route.key}. Add it to docs/catalog.mjs.`);
  if (!["session", "public", "service", "framework"].includes(metadata.policy.kind)) throw new Error(`Missing explicit authentication policy: ${route.key}`);
  const guarded = ["withRouteAuth", "loanRead", "loanMutation"].includes(route.guard);
  if (guarded && metadata.policy.kind !== "session") throw new Error(`Documentation contradicts session guard: ${route.key}`);
  if (route.guard === "delegated" && metadata.policy.kind !== "framework") throw new Error(`Delegated handler needs framework policy: ${route.key}`);
  if (metadata.policy.only?.some((role) => !roles.includes(role))) throw new Error(`Unknown authored role: ${route.key}`);
  if (route.roles && metadata.policy.only && metadata.policy.only.some((r) => !route.roles.includes(r))) throw new Error(`Documented role exceeds guard: ${route.key}`);
  const allowed = metadata.policy.kind === "session" ? metadata.policy.only ?? route.roles ?? roles : [];
  return { ...route, ...metadata, allowed, access: Object.fromEntries(roles.map((role) => [role, !allowed.includes(role) ? "—" : metadata.policy.own && role === "CLIENT" ? "Own records" : "Allowed"])) };
}

export function generate(root, catalog, pageCatalog) {
  const actual = inventory(root);
  const endpoints = actual.routes.map((route) => combineOperation(route, catalog[route.key]));
  for (const key of Object.keys(catalog)) if (!actual.routes.some((r) => r.key === key)) throw new Error(`Documentation for removed operation: ${key}`);
  for (const page of actual.pages) if (!pageCatalog[page.path]) throw new Error(`Undocumented page: ${page.path}`);
  for (const key of Object.keys(pageCatalog)) if (!actual.pages.some((p) => p.path === key)) throw new Error(`Documentation for removed page: ${key}`);
  for (const op of endpoints) for (const screen of op.screens) if (!pageCatalog[screen]) throw new Error(`Unknown screen ${screen} for ${op.key}`);
  const notice = "> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.\n\n";
  const matrix = notice + "# Action matrix\n\nAllowed means the role may attempt the action; the conditions on its endpoint entry still apply. Own records means the linked Member's records only. — means the role grants no access. Public authentication operations and the scheduler are listed separately. Menu visibility is described in the screen directory.\n\n" +
    [...new Set(endpoints.map((e) => e.group))].map((group) => `## ${group}\n\n` + table(["Action / API", ...roles.map((r) => roleNames[r]), "Scope and prerequisites"], endpoints.filter((e) => e.group === group && e.policy.kind === "session").map((e) => [`[${e.title}](endpoints.md#${endpointAnchor(e.key)})`, ...roles.map((r) => e.access[r]), e.conditions]))).join("\n\n") +
    "\n\n## Public and service operations\n\n" + table(["Action", "Access", "Requirement"], endpoints.filter((e) => e.policy.kind !== "session").map((e) => [`[${e.title}](endpoints.md#${endpointAnchor(e.key)})`, e.policy.kind, e.conditions])) + "\n";
  const reference = notice + "# Endpoint reference\n\nEach heading represents one exported HTTP operation. Authentication catch-all subpaths are delegated to NextAuth. Request examples are illustrative: replace IDs, dates, tokens and passwords with valid values. See [API conventions](../api.md) for shared errors and session requirements.\n\n" + endpoints.map((op) => {
    const query = op.request ?? op.path.replace(/\{([^}]+)\}/g, (_, name) => `${name}-demo`);
    const example = op.policy.kind === "framework" && !op.request ? "Use the application's NextAuth signIn/signOut helpers; see API conventions." : "```http\n" + `${op.method} ${query} HTTP/1.1\nHost: localhost:3000\n` + (op.policy.kind === "service" ? "Authorization: Bearer <CRON_SECRET>\n" : op.policy.kind === "session" ? "Cookie: <session-cookie-from-sign-in>\n" : "") + (op.body !== undefined ? `Content-Type: application/json\n\n${JSON.stringify(op.body, null, 2)}\n` : "") + "```";
    return `## ${op.key}\n\n**${op.title}** · ${op.group}\n\n` + table(["Contract", "Details"], [
      ["Authentication", op.policy.kind === "session" ? `Session · ${op.allowed.map((r) => roleNames[r]).join(", ")}` : op.policy.kind],
      ["Request", op.input], ["Success response", op.output], ["Conditions", op.conditions], ["Effects and audit", op.effects], ["Errors", op.errors],
      ["Screen", op.screens.length ? op.screens.map((p) => `\`${p}\``).join(", ") : "API/framework operation; no dedicated application action button"],
      ["Source", sourceLink(op.source)], ["Extracted guard", `\`${op.guard}\`${op.roles ? `; literal roles: ${op.roles.join(", ")}` : "; effective conditions reviewed from handler/service"}`],
    ]) + (op.schemas.length ? `\n\n**Validation expression(s), extracted from the handler:**\n\n\`\`\`ts\n${op.schemas.join("\n\n")}\n\`\`\`\n\nSee [validation reference](validation.md) for schema definitions and helper rules.` : "") + `\n\n${example}`;
  }).join("\n\n") + "\n";
  const navigation = notice + "# Screen directory\n\n## Sidebar menus\n\nLabels, destinations and roles below are extracted directly from lib/dashboard/navigation.ts. On mobile, use Open navigation. Expand the desktop sidebar if only icons are visible.\n\n" + table(["Menu label", "Destination", "Visible to", "Purpose"], actual.navigation.map((n) => [n.label, `\`${n.href}\``, n.roles.map((r) => roleNames[r]).join(", "), n.description])) +
    "\n\n## All pages and redirects\n\nPaths in braces require the indicated record ID. Loan details use an application ID; Treasurer member ledgers use a member ID. Everyone below means all four roles after sign-in, except the explicitly public entry pages.\n\n" + table(["Screen", "Path", "Audience", "How to use", "Source"], actual.pages.map((p) => { const [title, audience, description, guide] = pageCatalog[p.path]; return [`[${title}](../${guide === "access" ? "getting-started" : guide}.md)`, `\`${p.path}\``, audience === "everyone" ? "Everyone (see description)" : audience.split(" ").map((r) => roleNames[r]).join(", "), description, sourceLink(p.source)]; })) + "\n";

  const schemaFiles = ["lib/members/schemas.ts", "lib/savings/schemas.ts", "lib/loans/schemas.ts", "lib/loans/statement-types.ts", "lib/investments/schemas.ts", "lib/auth/passwords.ts"];
  const validation = notice + "# Validation reference\n\nThese definitions are copied from source without importing application modules or connecting to a database. Transformations, refinements and helper functions are retained so limits are not silently lost. Endpoint request descriptions translate these rules into plain language. Database-dependent eligibility and ownership checks also apply.\n\n" + schemaFiles.map((file) => {
    const content = read(root, file);
    const ast = parse(file, content);
    const definitions = ast.statements.filter((node) => !ts.isImportDeclaration(node) && !ts.isTypeAliasDeclaration(node) && !ts.isInterfaceDeclaration(node));
    return `## ${file}\n\n${sourceLink(file)}\n\n\`\`\`ts\n${definitions.map((node) => node.getText(ast)).join("\n\n")}\n\`\`\``;
  }).join("\n\n") + "\n";

  const schema = read(root, "prisma/schema.prisma");
  const blocks = [...schema.matchAll(/^(model|enum) (\w+) \{\n([\s\S]*?)^\}/gm)];
  const data = notice + "# Data dictionary\n\nGenerated from the current Prisma schema. This describes storage, including states that do not yet have an application workflow. A column or enum value does not imply a supported user action. Decimal amounts cross JSON interfaces as strings. Database migrations may add constraints/triggers beyond the declarative schema; see architecture and operations.\n\n" + blocks.map(([, kind, name, body]) => {
    if (kind === "enum") return `## ${name}\n\nEnum values: ${body.split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("//")).map((s) => `\`${s}\``).join(", ")}.`;
    const fields = body.split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("//") && !s.startsWith("@@")).map((s) => { const match = s.match(/^(\w+)\s+(\S+)(.*)$/); if (!match) throw new Error(`Unparsed Prisma field: ${name} ${s}`); return [match[1], `\`${match[2]}\``, match[3].trim() || "—"]; });
    return `## ${name}\n\n${table(["Field", "Type (? optional; [] relation list)", "Constraints / relation"], fields)}\n\n${body.split("\n").filter((s) => s.trim().startsWith("@@")).map((s) => `\`${s.trim()}\``).join(" · ")}`;
  }).join("\n\n") + `\n\nSource: ${sourceLink("prisma/schema.prisma")}\n`;
  const json = JSON.stringify({ version: 1, counts: { routeFiles: new Set(endpoints.map((e) => e.source)).size, operations: endpoints.length, pages: actual.pages.length }, navigation: actual.navigation, pages: actual.pages.map((p) => ({ ...p, title: pageCatalog[p.path][0], audience: pageCatalog[p.path][1] })), endpoints }, null, 2) + "\n";
  return { facts: JSON.parse(json), fingerprint: hash(json), files: { "generated/catalog.json": json, "generated/actions.md": matrix, "generated/endpoints.md": reference, "generated/navigation.md": navigation, "generated/validation.md": validation, "generated/data.md": data } };
}
