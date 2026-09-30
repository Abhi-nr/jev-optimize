import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";

const ModelEntrySchema = z.object({
  provider: z.string(),
  model: z.string(),
  max_context: z.number().int().min(0).optional(),
  cost_tier: z.enum(["low", "medium", "high"]).optional(),
});

const TierConfigSchema = z.array(ModelEntrySchema).min(1);

const ModelCatalogSchema = z.object({
  tiers: z.object({
    fast: TierConfigSchema,
    balanced: TierConfigSchema,
    strong: TierConfigSchema,
  }),
  defaults: z.object({
    tier: z.enum(["fast", "balanced", "strong"]).default("balanced"),
    fallback_tier: z
      .enum(["fast", "balanced", "strong"])
      .default("fast"),
  }),
});

export type ModelCatalog = z.infer<typeof ModelCatalogSchema>;

export function loadModelCatalog(path: string): ModelCatalog {
  const raw = parse(readFileSync(path, "utf-8"));
  const parsed = ModelCatalogSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid model catalog: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

export interface AppConfig {
  jevApiKey: string;
  jevBaseUrl: string;        // legacy / optional
  jevGatewayUrl: string;     // Vercel AI Gateway URL
  jevModel: string;          // model name in the gateway, e.g. "jev"
  jevConfidenceThreshold: number;
  jevTimeoutMs: number;
  modelCatalogPath: string;
  skillsShBaseUrl: string;
  skillsCacheDir: string;
  cavemanCliPath: string | null;
}

export function loadConfig(): AppConfig {
  const jevApiKey = process.env.JEV_API_KEY;
  if (!jevApiKey) {
    throw new Error("JEV_API_KEY env var is required");
  }

  // Legacy base URL (you can keep it but won't use it if you use gateway)
  const jevBaseUrl =
    process.env.JEV_BASE_URL ?? "https://api.typesafe.ai";

  // Vercel AI Gateway
  const jevGatewayUrl = process.env.JEV_GATEWAY_URL;
  if (!jevGatewayUrl) {
    throw new Error("JEV_GATEWAY_URL env var is required");
  }

  const jevModel =
    process.env.JEV_MODEL ?? "jev";

  const jevConfidenceThreshold = parseFloat(
    process.env.JEV_CONFIDENCE_THRESHOLD ?? "0.95"
  );
  const jevTimeoutMs = parseInt(
    process.env.JEV_TIMEOUT_MS ?? "2000",
    10
  );
  const modelCatalogPath =
    process.env.MODEL_CATALOG_PATH ??
    "config/modelCatalog.yaml";
  const skillsShBaseUrl =
    process.env.SKILLS_SH_BASE_URL ??
    "https://www.skills.sh";
  const skillsCacheDir =
    process.env.SKILLS_CACHE_DIR ?? ".skills-cache";
  const cavemanCliPath =
    process.env.CAVEMAN_CLI_PATH ?? null;

  return {
    jevApiKey,
    jevBaseUrl,
    jevGatewayUrl,
    jevModel,
    jevConfidenceThreshold,
    jevTimeoutMs,
    modelCatalogPath,
    skillsShBaseUrl,
    skillsCacheDir,
    cavemanCliPath,
  };
}