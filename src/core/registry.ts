import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  loadSource,
  loadTargetsFromDir,
  type LoadedSource,
} from "../patches/loader.js";
import type { TargetAdapter } from "../patches/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPatchesDir(): string {
  // tsup bundles into flat dist/ directory, so __dirname is dist/
  // We need to go up one level to project root, then into patches/
  // Also handles src/core/ case during dev/testing
  const candidate = join(__dirname, "..", "patches");
  // If we're in dist/, go up one level; if in src/core/, go up two
  // Use a heuristic: check if __dirname ends with /core
  if (__dirname.endsWith("/core") || __dirname.endsWith("\\core")) {
    return join(__dirname, "..", "..", "patches");
  }
  return candidate;
}

const sourceCache = new Map<string, LoadedSource>();
const targetCache = new Map<string, TargetAdapter[]>();

export async function getSource(name: string): Promise<LoadedSource> {
  if (sourceCache.has(name)) {
    return sourceCache.get(name)!;
  }

  const patchesDir = getPatchesDir();
  const metaPath = join(patchesDir, "sources", name, "meta.yaml");
  const source = await loadSource(metaPath);
  sourceCache.set(name, source);
  return source;
}

export async function getTargets(): Promise<TargetAdapter[]> {
  const cacheKey = "built-in";
  if (targetCache.has(cacheKey)) {
    return targetCache.get(cacheKey)!;
  }

  const patchesDir = getPatchesDir();
  const targetsDir = join(patchesDir, "targets");
  const targets = await loadTargetsFromDir(targetsDir);
  targetCache.set(cacheKey, targets);
  return targets;
}

export async function listSources(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const patchesDir = getPatchesDir();
  const sourcesDir = join(patchesDir, "sources");
  const entries = await readdir(sourcesDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export function clearCache(): void {
  sourceCache.clear();
  targetCache.clear();
}
