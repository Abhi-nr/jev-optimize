import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { JevRoutingEngine } from "../jevClient.js";
import type { RouteTaskOutput, JevDecision } from "../types.js";

export function createRouteTaskTool(
  server: McpServer,
  engine: JevRoutingEngine
) {
  server.registerTool(
    "route_task",
    {
      description:
        "Choose the best model tier for a given task using Jev, with fallback.",

      inputSchema: {
        task_type: z.enum([
          "code_edit",
          "research",
          "debug",
          "review",
          "arch_design",
        ]),

        constraints: z
          .object({
            max_cost: z
              .enum(["low", "medium", "high"])
              .optional(),

            latency: z
              .enum(["fast", "normal"])
              .optional(),

            needs_long_context: z
              .boolean()
              .optional(),

            requires_tool_use: z
              .boolean()
              .optional(),
          })
          .optional(),

        meta: z
          .object({
            turn_number: z.number().optional(),

            recent_tool_calls: z.number().optional(),

            recent_errors: z.number().optional(),

            avg_response_tokens_last_10: z
              .number()
              .optional(),
          })
          .optional(),
      },
    },

    async (input) => {
      const result = await engine.routeTask(input);

      let decision: JevDecision;
      let fallbackUsed: boolean;
      let fallbackReason: string | null = null;

      if (!result.ok) {
        // Jev call failed completely
        decision = result.fallbackDecision;

        fallbackUsed = true;

        fallbackReason = "jev_call_failed";
      } else {
        // Jev call succeeded
        decision = result.decision;

        fallbackUsed = result.fallbackUsed;

        if (result.fallbackUsed) {
          fallbackReason = result.fallbackReason;
        }
      }

      const selectedModel = engine.resolveModel(
        decision.model_tier
      );

      const output: RouteTaskOutput = {
        model_tier: decision.model_tier,
        reasoning_mode: decision.reasoning_mode,
        confidence: decision.confidence,
        fallback_used: fallbackUsed,
        fallback_reason: fallbackReason,
        selected_model: selectedModel,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    }
  );
}