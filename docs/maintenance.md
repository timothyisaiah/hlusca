# Maintain this handbook

## Files and ownership

The editable user guides are Markdown files in docs. docs/catalog.mjs supplies reviewed API descriptions, conditions, screen associations and special access rules. docs/config.mjs maps application source files to guide review groups and defines chapter order. The generator extracts actual HTTP exports, literal route-guard roles, schema expressions, navigation entries and Prisma model fields.

| File / directory | Edit directly? | Purpose |
| --- | --- | --- |
| docs/*.md | Yes | User guides, conventions, architecture and contributor instructions |
| docs/catalog.mjs | Yes | One catalog feeding both the endpoint reference and action matrix |
| docs/config.mjs | Yes | Source ownership, review groups and handbook chapters |
| docs/handbook.css, docs/handbook.js | Yes | Offline presentation, search, audience filtering and print styling |
| docs/assets | Yes, when screenshots are updated | Selected images embedded into the HTML build |
| docs/generated/* | No | Reproducible inventory, endpoint/action/navigation/schema/data references |
| docs/review-state.json | Use docs:review | Source fingerprints with explicit review explanations |
| docs/index.html | No | Standalone generated deliverable |

The application remains the source of truth for behavior. The build specification contains intended future work; document that as planned until implemented. Generated facts update from code; prose and service-level conditions require review. A fingerprint confirms reviewed file content, not formal proof of business correctness.

## Update documentation with an application change

1. Change the application and run `npm run docs:check` to see affected review groups or newly undocumented routes/pages.
2. Update the relevant user guide, endpoint catalog entries, screen descriptions and examples. Verify what the server actually enforces, including service-level conditions and any database constraints.
3. Run `npm run docs:generate` to refresh route, action, navigation, validation and data references. Unknown route patterns and missing operation/page entries fail rather than disappearing silently.
4. Acknowledge the reviewed source groups with a meaningful explanation. Only acknowledge after reading the changes and updating the guide or confirming that its instructions remain accurate.
5. Build the HTML and run the documentation checks. Commit source documentation, review state and generated artifacts with the application change.

```bash
npm run docs:review -- loans --note "Reviewed the revised repayment allocation behavior and updated the loan guide and endpoint conditions."
npm run docs:build
npm run docs:check
npm run docs:test
```

For a broad change, list several groups before `--note`. `--all` is available for a deliberate complete review. The named groups are access, members, savings, loans, investments and technical. New files under mapped directories are included automatically. A new source outside all mappings fails the check and must be assigned a group.

The generate/build commands do not silently acknowledge source changes. Build and check require current review fingerprints. Even a change that does not alter instructions needs a brief review note explaining why the guide remains accurate. Git shows the review-state delta alongside the code change for review.

## Add a page or endpoint

Add its description to docs/catalog.mjs. HTTP operations use keys such as `POST /api/loans/{id}/payments`; page paths use the same brace syntax for dynamic parameters. Choose the correct authentication kind and screen association. Literal roles on supported wrappers are extracted automatically. Document additional ownership/state/separation-of-duties rules in conditions and, where necessary, a reviewed narrower policy.

The matrix and endpoint reference are rendered from the same combined record. Do not copy separate role tables into multiple guides. Keep procedural explanations in guides and link to the generated matrix. Custom authentication, conditional roles and delegated handlers require explicit reviewed metadata. Extend the extractor and its tests when introducing a new wrapper or export convention.

Add new code ownership to docs/config.mjs where necessary. Run generate, review, build and check. Verify that the page appears in the screen directory and every exported method appears in the endpoint reference. Mark API-only operations clearly when the UI has no action button.

## Supported Markdown

Use ATX headings (`#`, `##`, `###`), paragraphs, flat ordered/bulleted lists, Markdown tables, fenced code, bold text, inline code, links and local PNG/JPEG/SVG images. Tables must have a separator row and matching cell counts; escape literal pipes with a backslash. Heading names must be unique within a chapter. Use relative links between guide files and heading anchors; the HTML build rewrites them to internal bookmarks and validates them.

Use a fenced block with language `flow` for a small ordered workflow: write one stage per line. The renderer produces numbered flow cards that wrap on mobile and print in order. Raw HTML is escaped. Nested lists, raw embedded scripts, remote images and richer Markdown extensions are not supported. This limited renderer uses the existing Node/TypeScript toolchain and adds no runtime dependency to the application.

Screenshots should show synthetic records or public screens. Save them in docs/assets, add meaningful alt text and a caption explaining their task. Verify menu/button names against the source after a UI change. The compiler embeds images as data URLs; a copied HTML remains self-contained.

## What CI checks

CI checks source coverage, per-guide source reviews, the operation/page catalog, navigation destinations, generated file freshness and internal links. It runs meaningful generator tests for added/removed operations, guard roles, nested routes, changed source detection and unsafe/broken Markdown. It uploads the verified HTML as a workflow artifact after validation.

Source fingerprints normalize CRLF/LF for cross-platform reproducibility. Generated HTML uses a stable application-source fingerprint instead of a new wall-clock timestamp on every build. This avoids unrelated generated diffs. Authored document changes still invalidate the generated HTML comparison.

These checks detect drift, not the meaning of arbitrary business code. Service logic, effective authorization, response shapes and examples must be reviewed by the developer changing them. Existing business tests are supporting evidence, and the documented permissions matrix is not a replacement for authorization tests.

## Validate presentation before sharing

Open docs/index.html directly. Search a task, an endpoint and an error; change the audience; clear filters; follow a heading bookmark; test the phone-width contents menu. Print with a search active and confirm the complete handbook is included. Check wide tables, long paths, code blocks and images. A detached HTML should make no network requests for its content or assets.

Source references: [documentation CLI](../scripts/docs.mjs), [extractor](../scripts/docs/source.mjs), [catalog](catalog.mjs), [configuration](config.mjs).

