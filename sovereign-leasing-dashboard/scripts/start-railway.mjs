#!/usr/bin/env node
/**
 * Railway production start:
 * - applies pending Prisma migrations when DATABASE_URL is configured
 *   (falls back to `prisma db push` when no migrations folder exists yet)
 * - starts Next.js on Railway's assigned PORT
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = (process.env.DATABASE_URL ?? "").trim();

if (databaseUrl) {
  const hasMigrations = existsSync(join(root, "prisma", "migrations"));
  const args = hasMigrations ? ["prisma", "migrate", "deploy"] : ["prisma", "db", "push"];
  console.log(`[start-railway] Syncing database schema: npx ${args.join(" ")}`);
  const result = spawnSync("npx", args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error("[start-railway] Database schema sync failed; refusing to start with an out-of-date schema.");
    process.exit(result.status ?? 1);
  }
} else {
  console.warn("[start-railway] DATABASE_URL is not set — starting in in-memory fallback demo mode.");
}

const port = process.env.PORT ?? "3000";
console.log(`[start-railway] Starting Next.js on port ${port}`);
const server = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
