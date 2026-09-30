import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillsManager } from "../skillsManager.js";

export function createFindSkillsTool(
  server: McpServer,
  skillsManager: SkillsManager
) {
  server.registerTool(
    "find_skills",
    {
      description: "Find available skills matching a query.",

      inputSchema: {
        query: z.string(),
      },
    },

    async (input) => {
      const result = await skillsManager.findSkills(
        input.query
      );

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