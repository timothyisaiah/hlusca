<!-- BEGIN:nextjs-agent-rules -->
# Global Rules

## Environment files and secrets

- Never read `.env` files directly, including with shell commands, file-reading tools, searches, scripts, or editor integrations.
- When environment values are required, use only the specific values supplied to the process through its environment or piped into the command at execution time.
- Never print, log, echo, persist, or otherwise expose environment-variable values or secrets.
- Use `.env.example` only to discover variable names and expected configuration shape; it must not contain real secrets.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
