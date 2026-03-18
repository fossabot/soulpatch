import { z } from "zod";

export const SectionRefSchema = z.object({
  id: z.string(),
  file: z.string(),
  priority: z.number().int().min(0).max(100).default(5),
  tags: z.array(z.string()).default([]),
});

export const SourceMetaSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  origin: z.string().url().optional(),
  sections: z.array(SectionRefSchema),
});

export const ReplacementSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const SectionOverrideSchema = z.object({
  file: z.string().nullable().optional(),
  prepend: z.string().optional(),
  append: z.string().optional(),
  replace: z.string().optional(),
});

export const AdaptationsSchema = z.object({
  sections: z
    .object({
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
  replacements: z.array(ReplacementSchema).optional(),
  prepend: z.string().optional(),
  append: z.string().optional(),
  overrides: z.record(z.string(), SectionOverrideSchema).optional(),
});

export const TargetAdapterSchema = z.object({
  name: z.string(),
  description: z.string(),
  match: z.object({
    providers: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
  }),
  adaptations: AdaptationsSchema,
});

export type SectionRef = z.infer<typeof SectionRefSchema>;
export type SourceMeta = z.infer<typeof SourceMetaSchema>;
export type Replacement = z.infer<typeof ReplacementSchema>;
export type SectionOverride = z.infer<typeof SectionOverrideSchema>;
export type Adaptations = z.infer<typeof AdaptationsSchema>;
export type TargetAdapter = z.infer<typeof TargetAdapterSchema>;
