import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillsManager } from "../skillsManager.js";

export function createListInstalledSkillsTool(
  server: McpServer,
  skillsManager: SkillsManager
) {
  server.registerTool(
    "list_installed_skills",
    {
      description: "List all currently installed skills.",
    },

    async () => {
      const result =
        await skillsManager.listInstalledSkills();

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