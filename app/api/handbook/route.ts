import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const handbookPath = join(process.cwd(), "docs", "index.html");
    const html = readFileSync(handbookPath, "utf-8");
    
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response("Handbook not found. Run `npm run docs:build` first.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
