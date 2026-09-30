import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillsManager } from "../skillsManager.js";

export function createUpdateSkillsTool(
  server: McpServer,
  skillsManager: SkillsManager
) {
  server.registerTool(
    "update_skills",
    {
      description: "Update installed skills.",

      inputSchema: {
        updateAll: z.boolean().default(true),
      },
    },

    async (input) => {
      const result = await skillsManager.updateSkills(
        input.updateAll
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