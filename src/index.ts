import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig, loadModelCatalog } from "./config.js";
import { JevRoutingEngine } from "./jevClient.js";
import { CavemanEngine } from "./caveman.js";
import { SkillsManager } from "./skillsManager.js";

import { createRouteTaskTool } from "./tools/routeTask.js";
import { createCompressContentTool } from "./tools/compressContent.js";
import { createFindSkillsTool } from "./tools/findSkills.js";
import { createInstallSkillTool } from "./tools/installSkill.js";
import { createListInstalledSkillsTool } from "./tools/listInstalledSkills.js";
import { createUpdateSkillsTool } from "./tools/updateSkills.js";

async function main() {
  console.error("Starting JEV-Caveman MCP server...");

  const config = loadConfig();
  console.error("Config loaded");

  const catalog = loadModelCatalog(config.modelCatalogPath);
  console.error("Model catalog loaded");

  const jevEngine = new JevRoutingEngine(config, catalog);
  const cavemanEngine = new CavemanEngine(config);
  const skillsManager = new SkillsManager(config);

  const server = new McpServer({
    name: "jev-caveman-router",
    version: "0.1.0",
  });

  createRouteTaskTool(server, jevEngine);
  createCompressContentTool(server, cavemanEngine);
  createFindSkillsTool(server, skillsManager);
  createInstallSkillTool(server, skillsManager);
  createListInstalledSkillsTool(server, skillsManager);
  createUpdateSkillsTool(server, skillsManager);

  console.error("Tools registered");

  const transport = new StdioServerTransport();

  console.error("Connecting MCP server...");

  await server.connect(transport);

  console.error("MCP server connected and waiting for requests");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});