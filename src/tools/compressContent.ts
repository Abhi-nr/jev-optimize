import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CavemanEngine } from "../caveman.js";

export function createCompressContentTool(
  server: McpServer,
  engine: CavemanEngine
) {
  server.registerTool(
    "compress_content",
    {
      description:
        "Compress content using Caveman to reduce token usage.",

      inputSchema: {
        text: z.string(),

        mode: z.enum(["lite", "full", "ultra"]),

        preserve_code: z.boolean(),
      },
    },

    async (input) => {
      const result = await engine.compress({
        text: input.text,
        mode: input.mode,
        preserve_code: input.preserve_code,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}