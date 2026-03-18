import micromatch from "micromatch";
import type { TargetAdapter } from "../patches/schema.js";

export interface ParsedModelId {
  provider: string | null;
  model: string;
  raw: string;
}

const PROVIDER_INFERENCE: Record<string, string> = {
  "gpt-": "openai",
  "o1-": "openai",
  "o3-": "openai",
  "o4-": "openai",
  "chatgpt-": "openai",
  "gemini-": "google",
  "gemma-": "google",
  "deepseek-": "deepseek",
  "claude-": "anthropic",
  "kimi-": "kimi",
  "moonshot-": "kimi",
};

export function parseModelId(raw: string): ParsedModelId {
  const trimmed = raw.trim();

  // Handle provider/model format
  if (trimmed.includes("/")) {
    const slashIndex = trimmed.indexOf("/");
    return {
      provider: trimmed.slice(0, slashIndex).toLowerCase(),
      model: trimmed.slice(slashIndex + 1).toLowerCase(),
      raw: trimmed,
    };
  }

  // Infer provider from model prefix
  const modelLower = trimmed.toLowerCase();
  for (const [prefix, provider] of Object.entries(PROVIDER_INFERENCE)) {
    if (modelLower.startsWith(prefix)) {
      return { provider, model: modelLower, raw: trimmed };
    }
  }

  return { provider: null, model: modelLower, raw: trimmed };
}

export function isClaudeModel(parsed: ParsedModelId): boolean {
  if (parsed.provider === "anthropic") return true;
  return parsed.model.startsWith("claude-");
}

export interface MatchResult {
  target: TargetAdapter;
  matchType: "exact" | "glob" | "provider" | "default";
}

export function matchTarget(
  parsed: ParsedModelId,
  targets: TargetAdapter[]
): MatchResult | null {
  // 1. Exact model ID match
  for (const target of targets) {
    const models = target.match.models ?? [];
    if (models.includes(parsed.model)) {
      return { target, matchType: "exact" };
    }
  }

  // 2. Glob pattern match
  for (const target of targets) {
    const models = target.match.models ?? [];
    const patterns = models.filter((m) => m.includes("*") || m.includes("?"));
    if (patterns.length > 0 && micromatch.isMatch(parsed.model, patterns)) {
      return { target, matchType: "glob" };
    }
  }

  // 3. Provider match
  if (parsed.provider) {
    for (const target of targets) {
      const providers = target.match.providers ?? [];
      if (providers.includes(parsed.provider)) {
        return { target, matchType: "provider" };
      }
    }
  }

  // 4. Default fallback
  const defaultTarget = targets.find((t) => t.name === "_default");
  if (defaultTarget) {
    return { target: defaultTarget, matchType: "default" };
  }

  return null;
}
