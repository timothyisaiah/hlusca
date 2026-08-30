import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

function loadEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("No database connection string was found.");
  }

  const client = new Client({
    connectionString,
  });

  await client.connect();

  const tables = await client.query<{
    table_name: string;
  }>(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );

  const migrations = await client.query<{
    migration_name: string;
    finished_at: Date | null;
  }>(
    "select migration_name, finished_at from _prisma_migrations order by started_at desc",
  ).catch(() => ({
    rows: [],
  }));

  console.log(
    JSON.stringify(
      {
        tables: tables.rows,
        migrations: migrations.rows,
      },
      null,
      2,
    ),
  );

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
