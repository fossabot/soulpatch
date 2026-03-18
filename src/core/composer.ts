import type {
  SourceMeta,
  TargetAdapter,
  SectionRef,
  Replacement,
} from "../patches/schema.js";

export interface ComposerInput {
  source: SourceMeta;
  target: TargetAdapter;
  sectionContents: Map<string, string>;
  filterSections?: string[];
  format?: "markdown" | "plain";
}

export interface ComposedPatch {
  text: string;
  includedSections: string[];
}

export function composePatch(input: ComposerInput): ComposedPatch {
  const { source, target, sectionContents, filterSections, format } = input;
  const adaptations = target.adaptations;

  // 1. Select sections
  let sections = [...source.sections];

  // Apply target include/exclude
  if (adaptations.sections?.include) {
    const includeSet = new Set(adaptations.sections.include);
    sections = sections.filter((s) => includeSet.has(s.id));
  }
  if (adaptations.sections?.exclude) {
    const excludeSet = new Set(adaptations.sections.exclude);
    sections = sections.filter((s) => !excludeSet.has(s.id));
  }

  // Apply user-requested section filter
  if (filterSections && filterSections.length > 0) {
    const filterSet = new Set(filterSections);
    sections = sections.filter((s) => filterSet.has(s.id));
  }

  // Sort by priority (highest first)
  sections.sort((a, b) => b.priority - a.priority);

  // 2. Render each section
  const renderedSections: string[] = [];
  const includedSections: string[] = [];

  for (const section of sections) {
    let content = renderSection(section, sectionContents, adaptations);
    if (content === null) continue;

    // Apply text replacements
    if (adaptations.replacements) {
      content = applyReplacements(content, adaptations.replacements);
    }

    renderedSections.push(content);
    includedSections.push(section.id);
  }

  // 3. Assemble final text
  let text = renderedSections.join("\n\n");

  if (adaptations.prepend) {
    text = adaptations.prepend.trimEnd() + "\n\n" + text;
  }
  if (adaptations.append) {
    text = text + "\n\n" + adaptations.append.trimEnd();
  }

  // 4. Format
  if (format === "plain") {
    text = stripMarkdown(text);
  }

  return { text, includedSections };
}

function renderSection(
  section: SectionRef,
  contents: Map<string, string>,
  adaptations: TargetAdapter["adaptations"]
): string | null {
  const override = adaptations.overrides?.[section.id];

  // If override has file: null and no replace, skip this section
  if (override?.file === null && !override?.replace) {
    return null;
  }

  // Get base content
  let content: string;
  if (override?.replace) {
    content = override.replace;
  } else {
    content = contents.get(section.id) ?? "";
    if (!content) return null;
  }

  // Apply per-section prepend/append
  if (override?.prepend) {
    content = override.prepend.trimEnd() + "\n\n" + content;
  }
  if (override?.append) {
    content = content + "\n\n" + override.append.trimEnd();
  }

  return content;
}

function applyReplacements(text: string, replacements: Replacement[]): string {
  let result = text;
  for (const { from, to } of replacements) {
    result = result.replaceAll(from, to);
  }
  return result;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // Remove headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/`(.+?)`/g, "$1") // Remove inline code
    .replace(/^[-*]\s+/gm, "- ") // Normalize list markers
    .replace(/\[(.+?)\]\(.+?\)/g, "$1"); // Remove links, keep text
}
