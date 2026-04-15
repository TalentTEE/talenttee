import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from project root (one level up) so backend/frontend share a single .env
function parseRootEnv(): Record<string, string> {
  const envPath = resolve(__dirname, "..", ".env");
  const parsed: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      parsed[key] = value;
    }
    console.log(`[next.config] Loaded ${Object.keys(parsed).length} vars from ${envPath}`);
    console.log(`[next.config] NEXT_PUBLIC_API_URL = ${parsed.NEXT_PUBLIC_API_URL ?? "(not set)"}`);
  } catch (err) {
    console.warn(`[next.config] Failed to read root .env: ${err}`);
  }
  return parsed;
}

const rootEnv = parseRootEnv();

// Export NEXT_PUBLIC_* vars explicitly via Next.js env config so they're
// embedded at build time, regardless of how the child process was spawned.
const publicEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(rootEnv)) {
  if (k.startsWith("NEXT_PUBLIC_")) publicEnv[k] = v;
}

const nextConfig: NextConfig = {
  env: publicEnv,
};

export default nextConfig;
