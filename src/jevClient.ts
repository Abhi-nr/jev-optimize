import fetch from "node-fetch";
import { z } from "zod";
import type { AppConfig, ModelCatalog } from "./config.js";
import type {
  JevDecision,
  RouteTaskInput,
  SelectedModel,
} from "./types.js";
import {
  JevDecisionSchema,
  ModelTierSchema,
  RouteTaskInputSchema,
} from "./types.js";

const JevRequestSchema = z.object({
  task_type: z.string(),
  constraints: z.object({
    max_cost: z.string().optional(),
    latency: z.string().optional(),
    needs_long_context: z.boolean().optional(),
    requires_tool_use: z.boolean().optional(),
  }),
  meta: z.object({
    turn_number: z.number().optional(),
    recent_tool_calls: z.number().optional(),
    recent_errors: z.number().optional(),
    avg_response_tokens_last_10: z.number().optional(),
  }),
});

type JevError = Error & { code?: string };

export class JevRoutingEngine {
  private config: AppConfig;
  private catalog: ModelCatalog;

  constructor(config: AppConfig, catalog: ModelCatalog) {
    this.config = config;
    this.catalog = catalog;
  }

  async routeTask(
    input: unknown
  ): Promise<
    | { ok: true; decision: JevDecision; fallbackUsed: false }
    | {
        ok: true;
        decision: JevDecision;
        fallbackUsed: true;
        fallbackReason: string;
      }
    | { ok: false; error: string; fallbackDecision: JevDecision }
  > {
    const parsed = RouteTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      const fallback = this.heuristicFallback({
        task_type: "debug",
      });
      return {
        ok: false,
        error: `Invalid input: ${parsed.error.message}`,
        fallbackDecision: fallback,
      };
    }

    const req = parsed.data;

    try {
      const decision = await this.callJev(req);
      if (
        decision.confidence >= this.config.jevConfidenceThreshold
      ) {
        return { ok: true, decision, fallbackUsed: false };
      }
      const fallback = this.heuristicFallback(req);
      return {
        ok: true,
        decision: fallback,
        fallbackUsed: true,
        fallbackReason: "jev_low_confidence",
      };
    } catch (err) {
      const e = err as JevError;
      const fallback = this.heuristicFallback(req);
      const reason =
        e.code === "ETIMEOUT"
          ? "jev_timeout"
          : e.code === "ENETWORK"
          ? "jev_network_error"
          : "jev_unknown_error";
      return {
        ok: true,
        decision: fallback,
        fallbackUsed: true,
        fallbackReason: reason,
      };
    }
  }

  private async callJev(
    input: RouteTaskInput
  ): Promise<JevDecision> {
    // Build a compact prompt for Jev via Vercel AI Gateway
    const prompt =
      `You are a model routing assistant. Choose the best model tier for this task.\n\n` +
      `Task type: ${input.task_type}\n` +
      `Constraints: ${JSON.stringify(input.constraints ?? {})}\n` +
      `Meta: ${JSON.stringify(input.meta ?? {})}\n\n` +
      `Reply ONLY with a JSON object like:\n` +
      `{"model_tier":"fast|balanced|strong","reasoning_mode":"shallow|deep","confidence":0.0-1.0}\n`;

    const body = {
      model: this.config.jevModel,
      messages: [
        {
          role: "user" as const,
          content: prompt,
        },
      ],
      temperature: 0,
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.jevTimeoutMs
    );

    let response;
    try {
      response = await fetch(this.config.jevGatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.jevApiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const e = err as Error & { code?: string };
      if (e.name === "AbortError") {
        const timeoutErr = new Error(
          "Jev request timed out"
        ) as JevError;
        timeoutErr.code = "ETIMEOUT";
        throw timeoutErr;
      }
      const netErr = new Error(
        "Network error calling Jev"
      ) as JevError;
      netErr.code = "ENETWORK";
      throw netErr;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      const err = new Error(
        `Jev API error: ${response.status} ${text}`
      ) as JevError;
      err.code = "EJEVAPI";
      throw err;
    }

    const json = await response.json();

    // Narrow the type safely
    let content: string = "";

    if (
      typeof json === "object" &&
      json !== null &&
      "choices" in json &&
      Array.isArray((json as { choices: unknown }).choices) &&
      (json as { choices: unknown[] }).choices.length > 0
    ) {
      const firstChoice = (json as { choices: unknown[] }).choices[0];
      if (
        typeof firstChoice === "object" &&
        firstChoice !== null &&
        "message" in firstChoice
      ) {
        const message = (firstChoice as { message: unknown }).message;
        if (
          typeof message === "object" &&
          message !== null &&
          // treat as a plain object for property check
          typeof (message as Record<string, unknown>).content === "string"
        ) {
          content = (message as { content: string }).content;
        }
      }
    }

    if (!content) {
      const err = new Error(
        "Jev response has no content"
      ) as JevError;
      err.code = "EJEVSCHEMA";
      throw err;
    }

    // Jev should return JSON string
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const err = new Error(
        `Jev response is not valid JSON: ${content.slice(0, 200)}`
      ) as JevError;
      err.code = "EJEVSCHEMA";
      throw err;
    }

    const decisionResult =
      JevDecisionSchema.safeParse(parsed);
    if (!decisionResult.success) {
      const err = new Error(
        `Invalid Jev decision: ${decisionResult.error.message}`
      ) as JevError;
      err.code = "EJEVSCHEMA";
      throw err;
    }

    return decisionResult.data;
  }

  private heuristicFallback(
    input: RouteTaskInput
  ): JevDecision {
    const { task_type, constraints, meta } = input;

    let tier: z.infer<typeof ModelTierSchema> =
      this.catalog.defaults.tier;

    if (task_type === "debug" || task_type === "code_edit") {
      if ((meta?.recent_errors ?? 0) > 2) {
        tier = "strong";
      } else if (constraints?.latency === "fast") {
        tier = "fast";
      } else {
        tier = "balanced";
      }
    } else if (task_type === "research") {
      tier =
        constraints?.needs_long_context ? "strong" : "balanced";
    } else if (task_type === "review") {
      tier = "balanced";
    } else if (task_type === "arch_design") {
      tier = "strong";
    }

    return {
      model_tier: tier,
      reasoning_mode:
        tier === "fast" ? "shallow" : "deep",
      confidence: 0.5,
      probabilities: {
        fast: tier === "fast" ? 0.7 : 0.2,
        balanced: tier === "balanced" ? 0.7 : 0.2,
        strong: tier === "strong" ? 0.7 : 0.2,
      },
    };
  }

  resolveModel(
    tier: z.infer<typeof ModelTierSchema>
  ): SelectedModel {
    const entries = this.catalog.tiers[tier];
    const entry = entries[0];
    return {
      provider: entry.provider,
      model: entry.model,
    };
  }
}