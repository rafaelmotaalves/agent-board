import type { BoardConfig, AgentConfig } from "./config";
import type { AgentService } from "./agents";
import type { Agent, AgentOptions } from "./types";
import logger from "./logger";

const log = logger.child({ module: "config-sync" });

function agentNeedsUpdate(existing: Agent, config: AgentConfig): boolean {
  if (existing.type !== (config.type ?? "copilot_cli_sdk")) return true;
  if (existing.port !== (config.port ?? null)) return true;
  if (existing.command !== (config.command ?? null)) return true;
  if (existing.folder !== config.folder) return true;

  const configOptions: AgentOptions = config.options ?? {};
  const existingKeys = Object.keys(existing.options);
  const configKeys = Object.keys(configOptions);
  if (existingKeys.length !== configKeys.length) return true;
  for (const key of configKeys) {
    const k = key as keyof AgentOptions;
    if (existing.options[k] !== configOptions[k]) return true;
  }

  return false;
}

export function syncAgentsFromConfig(config: BoardConfig, agentService: AgentService): void {
  const existingAgents = agentService.list();
  const agentsByName = new Map(existingAgents.map((a) => [a.name, a]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const agentConfig of config.agents) {
    const existing = agentsByName.get(agentConfig.name);

    if (!existing) {
      agentService.create({
        name: agentConfig.name,
        type: agentConfig.type,
        port: agentConfig.port,
        command: agentConfig.command,
        folder: agentConfig.folder,
        options: agentConfig.options,
        source: "config",
      });
      log.info({ agent: agentConfig.name }, "Created agent from config");
      created++;
    } else if (agentNeedsUpdate(existing, agentConfig)) {
      agentService.updateFromConfig(existing.id, {
        type: agentConfig.type,
        port: agentConfig.port,
        command: agentConfig.command,
        folder: agentConfig.folder,
        options: agentConfig.options,
      });
      log.info({ agent: agentConfig.name }, "Updated agent from config");
      updated++;
    } else {
      log.debug({ agent: agentConfig.name }, "Agent already up-to-date, skipping");
      skipped++;
    }
  }

  log.info({ created, updated, skipped }, "Config sync complete");
}
