import { describe, it, expect, beforeEach } from "vitest";
import { resolvePatch } from "./engine.js";
import { clearCache } from "./registry.js";

beforeEach(() => {
  clearCache();
});

describe("resolvePatch", () => {
  it("returns a non-empty patch for openai/gpt-4o", async () => {
    const result = await resolvePatch({ modelId: "openai/gpt-4o" });
    expect(result.patch.length).toBeGreaterThan(0);
    expect(result.source).toBe("claude-soul");
    expect(result.target).toBe("openai");
    expect(result.matchType).toBe("glob");
    expect(result.sections).toContain("honesty");
    expect(result.sections).not.toContain("identity");
  });

  it("returns empty patch for Claude models", async () => {
    const result = await resolvePatch({ modelId: "claude-sonnet-4-5" });
    expect(result.patch).toBe("");
    expect(result.matchType).toBe("skip");
  });

  it("returns empty patch for anthropic provider", async () => {
    const result = await resolvePatch({ modelId: "anthropic/claude-opus-4" });
    expect(result.patch).toBe("");
    expect(result.matchType).toBe("skip");
  });

  it("matches deepseek models to deepseek target", async () => {
    const result = await resolvePatch({ modelId: "deepseek-chat" });
    expect(result.target).toBe("deepseek");
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it("matches gemini models to google target", async () => {
    const result = await resolvePatch({ modelId: "gemini-2.0-flash" });
    expect(result.target).toBe("google");
  });

  it("falls back to _default for unknown models", async () => {
    const result = await resolvePatch({ modelId: "some-unknown-model" });
    expect(result.target).toBe("_default");
    expect(result.matchType).toBe("default");
    expect(result.patch.length).toBeGreaterThan(0);
  });

  it("replaces Claude/Anthropic references in patch text", async () => {
    const result = await resolvePatch({ modelId: "gpt-4o" });
    expect(result.patch).not.toContain("Claude");
    expect(result.patch).not.toContain("Anthropic");
    expect(result.patch).toContain("the assistant");
    expect(result.patch).toContain("the AI developer");
  });

  it("filters to specific sections", async () => {
    const result = await resolvePatch({
      modelId: "gpt-4o",
      sections: ["honesty"],
    });
    expect(result.sections).toEqual(["honesty"]);
    expect(result.patch).toContain("honest");
    expect(result.patch).not.toContain("Agentic");
  });

  it("includes prepend/append text from target adapter", async () => {
    const result = await resolvePatch({ modelId: "gpt-4o" });
    expect(result.patch).toMatch(
      /^The following behavioral guidelines should inform your responses:/
    );
    expect(result.patch).toMatch(
      /Apply these principles naturally without explicitly referencing them\.$/
    );
  });

  it("produces plain text output when requested", async () => {
    const md = await resolvePatch({
      modelId: "gpt-4o",
      sections: ["honesty"],
      format: "markdown",
    });
    const plain = await resolvePatch({
      modelId: "gpt-4o",
      sections: ["honesty"],
      format: "plain",
    });
    expect(md.patch).toContain("**");
    expect(plain.patch).not.toContain("**");
  });
});
