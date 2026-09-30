import { z } from "zod";

export const TaskTypeSchema = z.enum([
  "code_edit",
  "research",
  "debug",
  "review",
  "arch_design",
]);

export const CostTierSchema = z.enum(["low", "medium", "high"]);
export const LatencySchema = z.enum(["fast", "normal"]);

export const RoutingConstraintsSchema = z.object({
  max_cost: CostTierSchema.optional(),
  latency: LatencySchema.optional(),
  needs_long_context: z.boolean().optional(),
  requires_tool_use: z.boolean().optional(),
});

export const RoutingMetaSchema = z.object({
  turn_number: z.number().int().min(0).optional(),
  recent_tool_calls: z.number().int().min(0).optional(),
  recent_errors: z.number().int().min(0).optional(),
  avg_response_tokens_last_10: z.number().int().min(0).optional(),
});

export const RouteTaskInputSchema = z.object({
  task_type: TaskTypeSchema,
  constraints: RoutingConstraintsSchema.optional(),
  meta: RoutingMetaSchema.optional(),
});

export type RouteTaskInput = z.infer<typeof RouteTaskInputSchema>;

export const ModelTierSchema = z.enum(["fast", "balanced", "strong"]);
export const ReasoningModeSchema = z.enum(["shallow", "deep"]);

export const JevDecisionSchema = z.object({
  model_tier: ModelTierSchema,
  reasoning_mode: ReasoningModeSchema,
  confidence: z.number().min(0).max(1),
  probabilities: z
    .record(ModelTierSchema, z.number().min(0).max(1))
    .optional(),
});

export type JevDecision = z.infer<typeof JevDecisionSchema>;

export const SelectedModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
});

export type SelectedModel = z.infer<typeof SelectedModelSchema>;

export const RouteTaskOutputSchema = z.object({
  model_tier: ModelTierSchema,
  reasoning_mode: ReasoningModeSchema,
  confidence: z.number().min(0).max(1),
  fallback_used: z.boolean(),
  fallback_reason: z.string().nullable(),
  selected_model: SelectedModelSchema,
});

export type RouteTaskOutput = z.infer<typeof RouteTaskOutputSchema>;

export const CompressModeSchema = z.enum(["lite", "full", "ultra"]);

export const CompressContentInputSchema = z.object({
  text: z.string(),
  mode: CompressModeSchema.optional().default("full"),
  preserve_code: z.boolean().optional().default(true),
});

export type CompressContentInput = z.infer<
  typeof CompressContentInputSchema
>;

export const CompressContentOutputSchema = z.object({
  original_length: z.number().int().min(0),
  compressed_length: z.number().int().min(0),
  compression_ratio: z.number().min(0).max(1),
  compressed_text: z.string(),
  compression_applied: z.boolean(),
  handle: z.string().optional(),
});

export type CompressContentOutput = z.infer<
  typeof CompressContentOutputSchema
>;

export const SkillInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  repo_url: z.string().url(),
  install_url: z.string().url(),
  stars: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export type SkillInfo = z.infer<typeof SkillInfoSchema>;

export const FindSkillsInputSchema = z.object({
  query: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  task_domain: z.string().optional(),
});

export type FindSkillsInput = z.infer<typeof FindSkillsInputSchema>;

export const InstallSkillInputSchema = z.object({
  skill_url: z.string().url(),
});

export type InstallSkillInput = z.infer<
  typeof InstallSkillInputSchema
>;

export const InstallSkillOutputSchema = z.object({
  success: z.boolean(),
  path: z.string().optional(),
  error: z.string().optional(),
});

export type InstallSkillOutput = z.infer<
  typeof InstallSkillOutputSchema
>;

export const InstalledSkillSchema = z.object({
  name: z.string(),
  path: z.string(),
  version: z.string().optional(),
});

export type InstalledSkill = z.infer<typeof InstalledSkillSchema>;