import { readFileSync } from "fs";
import { join } from "path";

// Serve the built handbook as its own document. Rendering it inside an app page
// let the app's styles (including the dark theme) leak into the handbook's CSS.
export async function GET() {
  try {
    const html = readFileSync(join(process.cwd(), "docs", "index.html"), "utf-8");
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(
      "The handbook has not been generated yet. Run `npm run docs:build`, then refresh this page.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
