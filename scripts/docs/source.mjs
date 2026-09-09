import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

export const roles = ["CLIENT", "TREASURER", "BOARD", "ADMIN"];
export const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
export const normalize = (s) => s.replace(/\r\n/g, "\n");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const read = (root, file) => normalize(fs.readFileSync(path.join(root, file), "utf8"));
export function walk(root, directory) {
  if (!fs.existsSync(path.join(root, directory))) return [];
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(root, file) : [file];
  }).sort();
}
export function parse(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}: ${source.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ")}`);
  return source;
}
function exported(node) {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}
export function routePath(file) {
  return "/" + file.replace(/^app\//, "").replace(/\/(route|page)\.[jt]sx?$/, "").replace(/^(route|page)\.[jt]sx?$/, "")
    .split("/").filter((p) => p && !/^\(.+\)$/.test(p)).map((p) => p.replace(/^\[([^\]]+)\]$/, "{$1}")).join("/");
}
function arrayStrings(node) {
  if (!node || !ts.isArrayLiteralExpression(node)) throw new Error("Non-literal role array requires a documentation extractor update.");
  return node.elements.map((element) => {
    if (!ts.isStringLiteral(element) || !roles.includes(element.text)) throw new Error("Unknown role in guard.");
    return element.text;
  });
}
function property(node, name) {
  return node.properties.find((p) => p.name?.getText() === name)?.initializer;
}
export function inspectRoute(file, text) {
  const source = parse(file, text);
  const locals = new Map();
  const exports = new Map();
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const d of statement.declarationList.declarations) {
        locals.set(d.name.getText(), d.initializer);
        if (exported(statement) && methods.includes(d.name.getText())) exports.set(d.name.getText(), d.initializer);
      }
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      locals.set(statement.name.text, statement);
      if (exported(statement) && methods.includes(statement.name.text)) exports.set(statement.name.text, statement);
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const e of statement.exportClause.elements) {
        if (methods.includes(e.name.text)) exports.set(e.name.text, { delegated: e.propertyName?.text ?? e.name.text });
      }
    }
  }
  if (!exports.size) throw new Error(`No supported HTTP exports found in ${file}; document or extend the extractor.`);
  return [...exports].map(([method, node]) => {
    const result = { key: `${method} ${routePath(file)}`, method, path: routePath(file), source: file, guard: "custom", roles: null, schemas: [] };
    if (node.delegated) { result.guard = "delegated"; return result; }
    const seen = new Set();
    const foundGuards = [];
    function visit(current) {
      if (!current || seen.has(current)) return;
      seen.add(current);
      if (ts.isCallExpression(current)) {
        const name = current.expression.getText(source);
        if (["loanMutation", "loanRead", "withRouteAuth"].includes(name)) {
          foundGuards.push(name);
          const option = current.arguments[name === "withRouteAuth" ? 1 : 0];
          if (name !== "loanRead" && option && ts.isObjectLiteralExpression(option)) {
            const roleNode = property(option, "roles");
            if (roleNode) result.roles = arrayStrings(roleNode);
            const schema = property(option, "schema");
            if (schema) result.schemas.push(schema.getText(source));
            const action = property(option, "action");
            if (action && ts.isStringLiteral(action)) result.auditAction = action.text;
          }
        }
        if (ts.isPropertyAccessExpression(current.expression) && current.expression.name.text === "parse") result.schemas.push(current.expression.expression.getText(source));
        if (ts.isIdentifier(current.expression) && locals.has(name)) visit(locals.get(name));
      }
      ts.forEachChild(current, visit);
    }
    visit(node);
    const guards = [...new Set(foundGuards)];
    if (guards.length > 1) throw new Error(`Ambiguous authentication wrappers: ${result.key}`);
    if (guards.length) result.guard = guards[0];
    result.schemas = [...new Set(result.schemas)];
    return result;
  });
}
export function inventory(root) {
  const files = walk(root, "app");
  const routes = files.filter((p) => /\/route\.[jt]sx?$/.test(p)).flatMap((file) => inspectRoute(file, read(root, file)));
  const pages = files.filter((p) => /\/page\.[jt]sx?$/.test(p)).map((file) => ({ path: routePath(file), source: file }));
  if (new Set(routes.map((r) => r.key)).size !== routes.length) throw new Error("Duplicate HTTP operation paths.");
  const navFile = "lib/dashboard/navigation.ts";
  const ast = parse(navFile, read(root, navFile));
  let nav;
  for (const s of ast.statements) {
    if (!ts.isVariableStatement(s)) continue;
    const declaration = s.declarationList.declarations.find((d) => d.name.getText() === "navItems");
    if (declaration) nav = declaration.initializer;
  }
  if (!nav || !ts.isArrayLiteralExpression(nav)) throw new Error("Cannot extract navItems; update documentation extractor.");
  const navigation = nav.elements.map((node) => {
    if (!ts.isObjectLiteralExpression(node)) throw new Error("Unknown navigation entry.");
    const entry = { roles: arrayStrings(property(node, "roles")) };
    for (const key of ["href", "label", "description"]) {
      const value = property(node, key);
      if (!value || !ts.isStringLiteral(value)) throw new Error(`Cannot extract navigation ${key}.`);
      entry[key] = value.text;
    }
    if (!pages.some((p) => p.path === entry.href)) throw new Error(`Navigation points to a missing page: ${entry.href}`);
    return entry;
  });
  return { routes: routes.sort((a, b) => a.key.localeCompare(b.key, "en")), pages, navigation };
}

export function sourceState(root, groups, roots, files) {
  const all = [...new Set([...roots.flatMap((p) => walk(root, p)), ...files])].filter((p) => !/\.(test|integration\.test)\.[cm]?[jt]sx?$/.test(p) && !p.endsWith("test-fixtures.ts")).sort();
  const state = Object.fromEntries(Object.keys(groups).map((id) => [id, {}]));
  for (const file of all) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Tracked source missing: ${file}`);
    const matching = Object.entries(groups).filter(([, g]) => g.sources.some((p) => p.endsWith("/") ? file.startsWith(p) : file === p));
    if (!matching.length) throw new Error(`No documentation review group covers ${file}. Update docs/config.mjs.`);
    const content = file.endsWith(".ico") ? fs.readFileSync(path.join(root, file)) : read(root, file);
    for (const [id] of matching) state[id][file] = hash(content);
  }
  return state;
}
export function changedSources(before = {}, after = {}) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((file) => before[file] !== after[file]).sort();
}
