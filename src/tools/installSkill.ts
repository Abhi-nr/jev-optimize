import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillsManager } from "../skillsManager.js";

export function createInstallSkillTool(
  server: McpServer,
  skillsManager: SkillsManager
) {
  server.registerTool(
    "install_skill",
    {
      description: "Install a skill.",

      inputSchema: {
        skill_name: z.string(),
      },
    },

    async (input) => {
      const result = await skillsManager.installSkill(
        input.skill_name
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