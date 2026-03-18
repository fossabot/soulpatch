import { parseModelId, isClaudeModel, matchTarget } from "./matcher.js";
import { composePatch } from "./composer.js";
import { getSource, getTargets } from "./registry.js";

export interface PatchRequest {
  modelId: string;
  source?: string;
  sections?: string[];
  format?: "markdown" | "plain";
  metadata?: Record<string, unknown>;
}

export interface PatchResult {
  patch: string;
  source: string;
  target: string;
  sections: string[];
  modelId: string;
  matchType: string;
}

export async function resolvePatch(request: PatchRequest): Promise<PatchResult> {
  const parsed = parseModelId(request.modelId);

  // Claude models don't need patching
  if (isClaudeModel(parsed)) {
    return {
      patch: "",
      source: request.source ?? "claude-soul",
      target: "none",
      sections: [],
      modelId: `${parsed.provider ?? "unknown"}/${parsed.model}`,
      matchType: "skip",
    };
  }

  const sourceName = request.source ?? "claude-soul";
  const [loadedSource, targets] = await Promise.all([
    getSource(sourceName),
    getTargets(),
  ]);

  const match = matchTarget(parsed, targets);
  if (!match) {
    return {
      patch: "",
      source: sourceName,
      target: "none",
      sections: [],
      modelId: `${parsed.provider ?? "unknown"}/${parsed.model}`,
      matchType: "none",
    };
  }

  const composed = composePatch({
    source: loadedSource.meta,
    target: match.target,
    sectionContents: loadedSource.sections,
    filterSections: request.sections,
    format: request.format,
  });

  return {
    patch: composed.text,
    source: sourceName,
    target: match.target.name,
    sections: composed.includedSections,
    modelId: `${parsed.provider ?? "unknown"}/${parsed.model}`,
    matchType: match.matchType,
  };
}
