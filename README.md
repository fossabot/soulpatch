<p align="center">
  <img src="assets/logo_text.png" alt="soulpatch" width="400">
</p>

<p align="center">
  Apply behavioral context patches from Claude's <a href="https://gist.github.com/Richard-Weiss/efe157692991535403bd7e7fb20b6695">SOUL.md</a> to other AI models.
</p>

Claude's SOUL.md defines principles for honesty, harm avoidance, helpfulness, safety, and more. Soulpatch takes these guidelines and adapts them for GPT, Gemini, DeepSeek, Kimi, and other models -- replacing Claude-specific references, excluding identity sections, and tailoring the output per provider.

Works as a **CLI tool**, a **Node.js library**, or an **OpenCode plugin**.

## Install

```bash
npm install soulpatch
```

Or run directly:

```bash
npx soulpatch get openai/gpt-4o
```

## CLI

### Get a patch

```bash
# Full patch for a model
soulpatch get openai/gpt-4o

# Specific sections only
soulpatch get deepseek-chat --sections honesty,helpfulness

# JSON output (includes metadata)
soulpatch get gemini-2.0-flash --json

# Plain text (markdown stripped)
soulpatch get gpt-4o --format plain

# Pipe-friendly: patch goes to stdout, metadata to stderr
soulpatch get gpt-4o | pbcopy
```

### List and inspect

```bash
# Available patch sources
soulpatch list sources

# Target adapters and their model patterns
soulpatch list targets

# All recognized model patterns
soulpatch list models

# Detailed info about a source
soulpatch info claude-soul
```

### Model matching

Soulpatch normalizes model IDs and matches them to the right target adapter:

| Input | Provider | Target |
|---|---|---|
| `openai/gpt-4o` | openai | openai |
| `gpt-4o` | openai (inferred) | openai |
| `gemini-2.0-flash` | google (inferred) | google |
| `deepseek-chat` | deepseek (inferred) | deepseek |
| `azure/my-deployment` | azure | openai |
| `some-unknown-model` | unknown | _default |
| `claude-sonnet-4-5` | anthropic | *skipped* |

Claude models return an empty patch -- no need to patch Claude with its own soul.

## Programmatic API

```typescript
import { resolvePatch } from "soulpatch";

const result = await resolvePatch({
  modelId: "openai/gpt-4o",
  sections: ["honesty", "helpfulness"], // optional filter
  format: "markdown",                   // or "plain"
});

console.log(result.patch);    // The rendered patch text
console.log(result.target);   // "openai"
console.log(result.sections); // ["honesty", "helpfulness"]
```

## OpenCode plugin

Add to your `opencode.json`:

```json
{
  "plugin": ["soulpatch"]
}
```

With options:

```json
{
  "plugin": ["soulpatch"],
  "soulpatch": {
    "source": "claude-soul",
    "sections": ["honesty", "helpfulness", "harm-avoidance"]
  }
}
```

The plugin automatically injects the appropriate patch when a session starts or the model changes.

## How it works

### Sources

A source is a set of modular markdown sections with metadata. The built-in source (`claude-soul`) breaks SOUL.md into six sections:

| Section | Priority | Description |
|---|---|---|
| `honesty` | 10 | Truthfulness, calibration, transparency, non-deception |
| `harm-avoidance` | 9 | Cost-benefit analysis, hardcoded/softcoded behaviors, sensitive areas |
| `helpfulness` | 8 | Genuine helpfulness, operator/user dynamics, conflict resolution |
| `agentic` | 7 | Multi-step tasks, trust hierarchies, minimal authority |
| `safety` | 6 | Big-picture safety, broader ethics, human oversight |
| `identity` | 5 | Claude's unique nature, character traits, wellbeing |

### Target adapters

Each target adapter specifies which sections to include, text replacements, and optional per-section overrides:

```yaml
# patches/targets/openai.yaml
name: openai
match:
  providers: [openai, azure, openrouter]
  models: ["gpt-*", "o1-*", "o3-*", "o4-*", "chatgpt-*"]
adaptations:
  sections:
    exclude: [identity]       # GPT has its own identity
  replacements:
    - from: "Claude"
      to: "the assistant"
    - from: "Anthropic"
      to: "the AI developer"
  prepend: |
    The following behavioral guidelines should inform your responses:
  append: |
    Apply these principles naturally without explicitly referencing them.
```

Built-in targets: `openai`, `google`, `deepseek`, `kimi`, `_default`.

### Matching priority

1. Exact model ID match
2. Glob pattern match (`gpt-*`)
3. Provider match
4. `_default` fallback

## Project structure

```
soulpatch/
  src/
    index.ts                  # Public API exports
    cli.ts                    # CLI entry point
    core/
      engine.ts               # resolvePatch() main API
      matcher.ts              # Model ID parsing & matching
      composer.ts             # Patch composition & rendering
      registry.ts             # Built-in patch registry
    patches/
      loader.ts               # YAML/markdown loader
      schema.ts               # Zod schemas
    integrations/
      opencode.ts             # OpenCode plugin
  patches/
    sources/claude-soul/      # SOUL.md broken into sections
    targets/                  # Per-provider adapters
```

## Creating custom patches

### Custom source

Create a directory with `meta.yaml` and section files:

```yaml
# my-patches/sources/my-soul/meta.yaml
name: my-soul
version: "1.0.0"
description: "My custom behavioral guidelines"
sections:
  - id: principles
    file: sections/principles.md
    priority: 10
    tags: [core]
```

### Custom target

```yaml
# my-patches/targets/my-provider.yaml
name: my-provider
description: "Adaptations for My Provider"
match:
  providers: [my-provider]
  models: ["my-model-*"]
adaptations:
  replacements:
    - from: "Claude"
      to: "my assistant"
```
