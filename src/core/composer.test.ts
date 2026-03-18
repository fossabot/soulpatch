import { describe, it, expect } from "vitest";
import { composePatch } from "./composer.js";
import type { SourceMeta, TargetAdapter } from "../patches/schema.js";

const mockSource: SourceMeta = {
  name: "test-source",
  version: "1.0.0",
  description: "Test source",
  sections: [
    { id: "honesty", file: "honesty.md", priority: 10, tags: ["core"] },
    { id: "safety", file: "safety.md", priority: 8, tags: ["safety"] },
    {
      id: "identity",
      file: "identity.md",
      priority: 5,
      tags: ["personality"],
    },
  ],
};

const mockContents = new Map([
  ["honesty", "Be honest and transparent. Claude values truth."],
  ["safety", "Safety is paramount. Anthropic prioritizes safety."],
  ["identity", "Claude is a unique AI assistant by Anthropic."],
]);

describe("composePatch", () => {
  it("includes all sections by default, sorted by priority", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {},
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.includedSections).toEqual(["honesty", "safety", "identity"]);
    expect(result.text).toContain("Be honest");
    expect(result.text).toContain("Safety is paramount");
  });

  it("excludes sections based on target adapter", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        sections: { exclude: ["identity"] },
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.includedSections).not.toContain("identity");
    expect(result.text).not.toContain("unique AI assistant");
  });

  it("includes only specified sections", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        sections: { include: ["honesty"] },
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.includedSections).toEqual(["honesty"]);
  });

  it("applies text replacements", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        replacements: [
          { from: "Claude", to: "the assistant" },
          { from: "Anthropic", to: "the AI developer" },
        ],
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.text).toContain("the assistant values truth");
    expect(result.text).toContain("the AI developer prioritizes safety");
    expect(result.text).not.toContain("Claude");
    expect(result.text).not.toContain("Anthropic");
  });

  it("applies prepend and append", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        sections: { include: ["honesty"] },
        prepend: "HEADER TEXT",
        append: "FOOTER TEXT",
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.text).toMatch(/^HEADER TEXT/);
    expect(result.text).toMatch(/FOOTER TEXT$/);
  });

  it("applies per-section overrides (append)", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        sections: { include: ["honesty"] },
        overrides: {
          honesty: {
            append: "Extra honesty note.",
          },
        },
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.text).toContain("Extra honesty note.");
  });

  it("skips section with file: null override and no replace", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        overrides: {
          identity: { file: null },
        },
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.includedSections).not.toContain("identity");
  });

  it("replaces section content with override", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {
        sections: { include: ["honesty"] },
        overrides: {
          honesty: {
            replace: "Custom honesty content.",
          },
        },
      },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
    });

    expect(result.text).toContain("Custom honesty content.");
    expect(result.text).not.toContain("Be honest and transparent");
  });

  it("respects filterSections parameter", () => {
    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: {},
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: mockContents,
      filterSections: ["honesty", "safety"],
    });

    expect(result.includedSections).toEqual(["honesty", "safety"]);
    expect(result.text).not.toContain("unique AI assistant");
  });

  it("strips markdown in plain format", () => {
    const contents = new Map([
      ["honesty", "## Be Honest\n\n**Always** tell the *truth*. Use `code`."],
    ]);

    const target: TargetAdapter = {
      name: "test",
      description: "Test",
      match: { providers: ["test"] },
      adaptations: { sections: { include: ["honesty"] } },
    };

    const result = composePatch({
      source: mockSource,
      target,
      sectionContents: contents,
      format: "plain",
    });

    expect(result.text).not.toContain("##");
    expect(result.text).not.toContain("**");
    expect(result.text).not.toContain("`");
    expect(result.text).toContain("Always");
    expect(result.text).toContain("truth");
  });
});
