import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import yaml from "js-yaml";
import {
  SourceMetaSchema,
  TargetAdapterSchema,
  type SourceMeta,
  type TargetAdapter,
} from "./schema.js";

export interface LoadedSource {
  meta: SourceMeta;
  sections: Map<string, string>;
}

export async function loadSource(metaPath: string): Promise<LoadedSource> {
  const raw = await readFile(metaPath, "utf-8");
  const parsed = yaml.load(raw);
  const meta = SourceMetaSchema.parse(parsed);

  const baseDir = dirname(metaPath);
  const sections = new Map<string, string>();

  for (const section of meta.sections) {
    const filePath = join(baseDir, section.file);
    const content = await readFile(filePath, "utf-8");
    sections.set(section.id, content.trim());
  }

  return { meta, sections };
}

export async function loadTarget(filePath: string): Promise<TargetAdapter> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = yaml.load(raw);
  return TargetAdapterSchema.parse(parsed);
}

export async function loadTargetsFromDir(
  dirPath: string
): Promise<TargetAdapter[]> {
  const entries = await readdir(dirPath);
  const yamlFiles = entries.filter(
    (e) => e.endsWith(".yaml") || e.endsWith(".yml")
  );

  const targets: TargetAdapter[] = [];
  for (const file of yamlFiles) {
    const target = await loadTarget(join(dirPath, file));
    targets.push(target);
  }

  return targets;
}
