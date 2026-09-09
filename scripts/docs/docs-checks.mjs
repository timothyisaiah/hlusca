// Explicit Node test entrypoint; kept outside Vitest's *.test.* discovery.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectRoute, routePath, inventory, sourceState, changedSources, normalize, hash } from "./source.mjs";
import { combineOperation } from "./generate.mjs";
import { renderMarkdown } from "./markdown.mjs";

function fixture(t, entries = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hlusca-docs-test-"));
  for (const [file, content] of Object.entries(entries)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  t.after(() => {
    // Delete only the exact directory allocated above, never a computed parent.
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("hlusca-docs-test-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}
test("routes retain each HTTP operation and method-specific guard roles", () => {
  const routes = inspectRoute("app/api/things/route.ts", `
    export const dynamic = "force-dynamic";
    export const GET = loanRead(async () => new Response());
    export const POST = loanMutation({ roles: ["ADMIN"], schema: thingSchema, execute: save });
  `);
  assert.deepEqual(routes.map((r) => [r.method, r.roles]), [["GET", null], ["POST", ["ADMIN"]]]);
  assert.deepEqual(routes[1].schemas, ["thingSchema"]);
  const changed = inspectRoute("app/api/things/route.ts", 'export const POST = loanMutation({ roles: ["TREASURER"], schema: thingSchema });')[0];
  assert.deepEqual(combineOperation(changed, { policy: { kind: "session" } }).allowed, ["TREASURER"]);
});
test("follows locally wrapped handler calls, with distinct read/write access", () => {
  const routes = inspectRoute("app/api/things/route.ts", `
    const read = withRouteAuth(async () => {}, { roles: ["BOARD"] });
    const write = withRouteAuth(async () => {}, { roles: ["ADMIN"] });
    export async function GET(req, ctx) { return read(req, ctx); }
    export async function PATCH(req, ctx) { return write(req, ctx); }
  `);
  assert.deepEqual(routes.map((r) => r.roles), [["BOARD"], ["ADMIN"]]);
});
test("delegated exports, route groups and dynamic IDs have stable paths", () => {
  const routes = inspectRoute("app/api/auth/[...nextauth]/route.ts", 'export { authHandler as GET, authHandler as POST };');
  assert.equal(routes.length, 2);
  assert.equal(routes[0].guard, "delegated");
  assert.equal(routes[0].path, "/api/auth/{...nextauth}");
  assert.equal(routePath("app/(auth)/sign-in/page.tsx"), "/sign-in");
  assert.equal(routePath("app/dashboard/loans/[id]/page.tsx"), "/dashboard/loans/{id}");
  assert.equal(routePath("app/page.tsx"), "/");
});
test("missing docs and contradictory policies fail rather than broadening access", () => {
  const route = inspectRoute("app/api/example/route.ts", 'export const POST = loanMutation({ roles: ["ADMIN"] });')[0];
  assert.throws(() => combineOperation(route), /Undocumented operation/);
  assert.throws(() => combineOperation(route, { policy: { kind: "public" } }), /contradicts session guard/);
  assert.throws(() => combineOperation(route, { policy: { kind: "session", only: ["CLIENT"] } }), /exceeds guard/);
  assert.throws(() => inspectRoute("app/api/example/route.ts", 'export const POST = loanMutation({ roles: permissionList });'), /Non-literal/);
  assert.throws(() => inspectRoute("app/api/example/route.ts", 'export const dynamic = "force-dynamic";'), /No supported HTTP/);
});
test("new routes and pages appear automatically; broken navigation fails", (t) => {
  const root = fixture(t, {
    "app/dashboard/page.tsx": "export default function Page() {}",
    "app/api/example/route.ts": "export async function GET() {}",
    "lib/dashboard/navigation.ts": 'export const navItems = [{ href: "/dashboard", label: "Desk", description: "Work", roles: ["ADMIN"] }];',
  });
  assert.equal(inventory(root).routes.length, 1);
  fs.writeFileSync(path.join(root, "app/api/example/route.ts"), "export async function GET() {}\nexport async function POST() {}");
  assert.equal(inventory(root).routes.length, 2);
  fs.unlinkSync(path.join(root, "app/dashboard/page.tsx"));
  assert.throws(() => inventory(root), /missing page/);
});
test("source review detects edits, additions, deletions and unowned files", (t) => {
  const root = fixture(t, { "lib/loans/service.ts": "old", "lib/loans/service.test.ts": "test only" });
  const groups = { loans: { sources: ["lib/loans/"] } };
  const before = sourceState(root, groups, ["lib"], []);
  assert.equal(Object.keys(before.loans).length, 1);
  fs.writeFileSync(path.join(root, "lib/loans/service.ts"), "new");
  fs.writeFileSync(path.join(root, "lib/loans/extra.ts"), "new file");
  const after = sourceState(root, groups, ["lib"], []);
  assert.deepEqual(changedSources(before.loans, after.loans), ["lib/loans/extra.ts", "lib/loans/service.ts"]);
  assert.deepEqual(changedSources(after.loans, before.loans), ["lib/loans/extra.ts", "lib/loans/service.ts"]);
  fs.writeFileSync(path.join(root, "lib/unmapped.ts"), "new module");
  assert.throws(() => sourceState(root, groups, ["lib"], []), /No documentation review group/);
  assert.equal(hash(normalize("line\r\n")), hash(normalize("line\n")));
});
test("Markdown escapes HTML and rejects unsafe schemes, missing files and bad tables", (t) => {
  const root = fixture(t);
  const options = { root, file: "guide.md", id: "guide", sections: [] };
  assert.match(renderMarkdown("<script>alert(1)</script>", options).html, /&lt;script&gt;/);
  assert.throws(() => renderMarkdown("[bad](javascript:alert)", options), /Unsupported link scheme/);
  assert.throws(() => renderMarkdown("[gone](missing.md)", options), /Broken link/);
  assert.throws(() => renderMarkdown("| A | B |\n| --- | --- |\n| C |", options), /Mismatched table/);
  assert.throws(() => renderMarkdown("# Repeated\n# Repeated", options), /Duplicate heading/);
  assert.throws(() => renderMarkdown("```js\nno closing fence", options), /Unclosed code/);
});
test("Markdown resolves chapter bookmarks and embeds local images for offline use", (t) => {
  const root = fixture(t, { "docs/assets/picture.png": "synthetic image bytes" });
  const result = renderMarkdown("# Guide\n\n[Loan help](loans.md#repayments)\n\n![Example](assets/picture.png)\n\n```flow\nApply\nReview\n```", { root, file: "guide.md", id: "guide", sections: [{ id: "loans", file: "loans.md" }] });
  assert.deepEqual(result.links, ["#loans--repayments"]);
  assert.match(result.html, /src="data:image\/png;base64,/);
  assert.match(result.html, /class="flow"/);
  assert.match(result.html, /id="guide--guide"/);
});
