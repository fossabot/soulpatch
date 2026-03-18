import { resolvePatch, type PatchRequest } from "../core/engine.js";

export interface SoulpatchConfig {
  source?: string;
  sections?: string[];
  remoteSources?: string[];
}

export interface OpenCodeSession {
  model: string;
  addSystemContext(content: string): void;
  replaceSystemContext(key: string, content: string): void;
}

export interface OpenCodePluginContext {
  project: unknown;
  client: unknown;
  config?: SoulpatchConfig;
}

export const SoulpatchPlugin = async (ctx: OpenCodePluginContext) => {
  const config = ctx.config ?? {};

  async function getPatch(modelId: string): Promise<string> {
    const request: PatchRequest = {
      modelId,
      source: config.source,
      sections: config.sections,
    };

    const result = await resolvePatch(request);

    if (!result.patch) return "";

    return `\n\n<!-- soulpatch: ${result.source} → ${result.target} -->\n${result.patch}`;
  }

  return {
    "session.created": async ({ session }: { session: OpenCodeSession }) => {
      const patch = await getPatch(session.model);
      if (patch) {
        session.addSystemContext(patch);
      }
    },

    "model.changed": async ({
      session,
      newModel,
    }: {
      session: OpenCodeSession;
      newModel: string;
    }) => {
      const patch = await getPatch(newModel);
      session.replaceSystemContext("soulpatch", patch);
    },
  };
};
