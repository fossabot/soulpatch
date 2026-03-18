#!/usr/bin/env node

import { Command } from "commander";
import { resolvePatch } from "./core/engine.js";
import { getSource, getTargets, listSources } from "./core/registry.js";

const program = new Command();

program
  .name("soulpatch")
  .description(
    "Apply behavioral context patches from Claude's SOUL.md to other AI models"
  )
  .version("0.1.0");

program
  .command("get")
  .description("Get a behavioral patch for a model")
  .argument("<modelId>", "Model ID (e.g., openai/gpt-4o, deepseek-chat)")
  .option("-s, --source <source>", "Patch source to use", "claude-soul")
  .option(
    "--sections <sections>",
    "Comma-separated list of sections to include"
  )
  .option("-f, --format <format>", "Output format (markdown|plain)", "markdown")
  .option("--json", "Output as JSON")
  .action(async (modelId: string, opts) => {
    const sections = opts.sections
      ? opts.sections.split(",").map((s: string) => s.trim())
      : undefined;

    const result = await resolvePatch({
      modelId,
      source: opts.source,
      sections,
      format: opts.format as "markdown" | "plain",
    });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!result.patch) {
        if (result.matchType === "skip") {
          console.error(
            `Model ${result.modelId} is a Claude model — no patch needed.`
          );
        } else {
          console.error(`No matching target found for ${result.modelId}`);
        }
        process.exit(1);
      }

      // Print metadata to stderr so stdout is just the patch (pipe-friendly)
      console.error(
        `Source: ${result.source} | Target: ${result.target} | Sections: ${result.sections.join(", ")}`
      );
      console.log(result.patch);
    }
  });

const listCmd = program
  .command("list")
  .description("List available sources, targets, or models");

listCmd
  .command("sources")
  .description("List available patch sources")
  .action(async () => {
    const sources = await listSources();
    for (const source of sources) {
      const loaded = await getSource(source);
      console.log(`${source} — ${loaded.meta.description}`);
      for (const section of loaded.meta.sections) {
        console.log(
          `  ${section.id} (priority: ${section.priority}, tags: ${section.tags.join(", ")})`
        );
      }
    }
  });

listCmd
  .command("targets")
  .description("List available target adapters")
  .action(async () => {
    const targets = await getTargets();
    for (const target of targets) {
      const providers = target.match.providers?.join(", ") ?? "any";
      const models = target.match.models?.join(", ") ?? "any";
      console.log(`${target.name} — ${target.description}`);
      console.log(`  Providers: ${providers}`);
      console.log(`  Models: ${models}`);
    }
  });

listCmd
  .command("models")
  .description("List all known model patterns")
  .action(async () => {
    const targets = await getTargets();
    for (const target of targets) {
      if (target.name === "_default") continue;
      const models = target.match.models ?? [];
      for (const model of models) {
        console.log(`${model} → ${target.name}`);
      }
    }
  });

program
  .command("info")
  .description("Show info about a patch source")
  .argument("<source>", "Source name (e.g., claude-soul)")
  .action(async (sourceName: string) => {
    try {
      const loaded = await getSource(sourceName);
      const meta = loaded.meta;
      console.log(`Name: ${meta.name}`);
      console.log(`Version: ${meta.version}`);
      console.log(`Description: ${meta.description}`);
      if (meta.origin) console.log(`Origin: ${meta.origin}`);
      console.log(`\nSections (${meta.sections.length}):`);
      for (const section of meta.sections) {
        const content = loaded.sections.get(section.id) ?? "";
        const lines = content.split("\n").length;
        console.log(
          `  ${section.id} — priority: ${section.priority}, tags: [${section.tags.join(", ")}], ${lines} lines`
        );
      }
    } catch {
      console.error(`Source "${sourceName}" not found.`);
      process.exit(1);
    }
  });

program.parse();
