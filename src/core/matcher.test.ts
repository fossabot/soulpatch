import { describe, it, expect } from "vitest";
import { parseModelId, isClaudeModel, matchTarget } from "./matcher.js";
import type { TargetAdapter } from "../patches/schema.js";

describe("parseModelId", () => {
  it("parses provider/model format", () => {
    const result = parseModelId("openai/gpt-4o");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  it("infers OpenAI provider from gpt prefix", () => {
    const result = parseModelId("gpt-4o");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  it("infers OpenAI from o1/o3/o4 prefixes", () => {
    expect(parseModelId("o1-preview").provider).toBe("openai");
    expect(parseModelId("o3-mini").provider).toBe("openai");
    expect(parseModelId("o4-mini").provider).toBe("openai");
  });

  it("infers Google provider from gemini prefix", () => {
    const result = parseModelId("gemini-2.0-flash");
    expect(result.provider).toBe("google");
  });

  it("infers DeepSeek provider", () => {
    const result = parseModelId("deepseek-chat");
    expect(result.provider).toBe("deepseek");
  });

  it("infers Anthropic provider from claude prefix", () => {
    const result = parseModelId("claude-sonnet-4-5");
    expect(result.provider).toBe("anthropic");
  });

  it("infers Kimi provider", () => {
    expect(parseModelId("kimi-latest").provider).toBe("kimi");
    expect(parseModelId("moonshot-v1").provider).toBe("kimi");
  });

  it("returns null provider for unknown models", () => {
    const result = parseModelId("some-random-model");
    expect(result.provider).toBeNull();
  });

  it("normalizes to lowercase", () => {
    const result = parseModelId("OpenAI/GPT-4o");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  it("trims whitespace", () => {
    const result = parseModelId("  openai/gpt-4o  ");
    expect(result.provider).toBe("openai");
  });

  it("preserves raw value", () => {
    const result = parseModelId("OpenAI/GPT-4o");
    expect(result.raw).toBe("OpenAI/GPT-4o");
  });
});

describe("isClaudeModel", () => {
  it("returns true for anthropic provider", () => {
    expect(isClaudeModel(parseModelId("anthropic/claude-sonnet-4-5"))).toBe(true);
  });

  it("returns true for claude- prefix without provider", () => {
    expect(isClaudeModel(parseModelId("claude-3-opus"))).toBe(true);
  });

  it("returns false for non-Claude models", () => {
    expect(isClaudeModel(parseModelId("openai/gpt-4o"))).toBe(false);
    expect(isClaudeModel(parseModelId("deepseek-chat"))).toBe(false);
  });
});

const mockTargets: TargetAdapter[] = [
  {
    name: "openai",
    description: "OpenAI",
    match: {
      providers: ["openai", "azure"],
      models: ["gpt-*", "o1-*", "o3-*", "chatgpt-*"],
    },
    adaptations: { replacements: [] },
  },
  {
    name: "google",
    description: "Google",
    match: {
      providers: ["google"],
      models: ["gemini-*"],
    },
    adaptations: { replacements: [] },
  },
  {
    name: "_default",
    description: "Default",
    match: { providers: [], models: [] },
    adaptations: { replacements: [] },
  },
];

describe("matchTarget", () => {
  it("matches by glob pattern", () => {
    const result = matchTarget(parseModelId("gpt-4o"), mockTargets);
    expect(result?.target.name).toBe("openai");
    expect(result?.matchType).toBe("glob");
  });

  it("matches by provider", () => {
    const result = matchTarget(parseModelId("azure/my-deployment"), mockTargets);
    expect(result?.target.name).toBe("openai");
    expect(result?.matchType).toBe("provider");
  });

  it("falls back to default for unknown models", () => {
    const result = matchTarget(parseModelId("unknown-model"), mockTargets);
    expect(result?.target.name).toBe("_default");
    expect(result?.matchType).toBe("default");
  });

  it("matches gemini models to google target", () => {
    const result = matchTarget(parseModelId("gemini-2.0-flash"), mockTargets);
    expect(result?.target.name).toBe("google");
    expect(result?.matchType).toBe("glob");
  });
});
