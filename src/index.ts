export { resolvePatch } from "./core/engine.js";
export type { PatchRequest, PatchResult } from "./core/engine.js";

export { parseModelId, isClaudeModel, matchTarget } from "./core/matcher.js";
export type { ParsedModelId, MatchResult } from "./core/matcher.js";

export { composePatch } from "./core/composer.js";
export type { ComposerInput, ComposedPatch } from "./core/composer.js";

export { getSource, getTargets, listSources } from "./core/registry.js";

export { SoulpatchPlugin } from "./integrations/opencode.js";
export type { SoulpatchConfig, OpenCodeSession } from "./integrations/opencode.js";
