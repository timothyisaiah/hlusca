import { readFileSync } from "fs";
import { join } from "path";

function readHandbook() {
  try {
    return readFileSync(join(process.cwd(), "docs", "index.html"), "utf-8");
  } catch {
    return null;
  }
}

export default function HandbookPage() {
  const html = readHandbook();

  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Handbook Not Available</h1>
      <p className="text-gray-700 mb-4">
        The handbook has not been generated yet. To build it, run:
      </p>
      <pre className="bg-gray-100 p-4 rounded mb-4">npm run docs:build</pre>
      <p className="text-gray-600 text-sm">
        After building, refresh this page to view the handbook.
      </p>
    </div>
  );
}
