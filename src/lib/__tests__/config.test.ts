import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, ConfigValidationError } from "@/lib/config";

const testDir = resolve(tmpdir(), "agent-board-config-test-" + process.pid);

function writeConfig(filename: string, content: string): string {
  const path = resolve(testDir, filename);
  writeFileSync(path, content, "utf-8");
  return path;
}

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("loads a valid config with a copilot agent", () => {
    const path = writeConfig("valid.json", JSON.stringify({
      agents: [
        { name: "My Agent", type: "copilot_cli_sdk", port: 8000, folder: "/workspace" },
      ],
    }));
    const config = loadConfig(path);
    expect(config.agents).toHaveLength(1);
    expect(config.agents[0].name).toBe("My Agent");
    expect(config.agents[0].type).toBe("copilot_cli_sdk");
    expect(config.agents[0].port).toBe(8000);
    expect(config.agents[0].folder).toBe("/workspace");
  });

  it("loads a valid config with an ACP agent", () => {
    const path = writeConfig("acp.json", JSON.stringify({
      agents: [
        { name: "ACP Agent", type: "acp", command: "python agent.py", folder: "/project" },
      ],
    }));
    const config = loadConfig(path);
    expect(config.agents).toHaveLength(1);
    expect(config.agents[0].type).toBe("acp");
    expect(config.agents[0].command).toBe("python agent.py");
  });

  it("loads a config with options", () => {
    const path = writeConfig("opts.json", JSON.stringify({
      agents: [
        { name: "Agent", port: 8000, folder: "/work", options: { parallel_planning: true } },
      ],
    }));
    const config = loadConfig(path);
    expect(config.agents[0].options).toEqual({ parallel_planning: true });
  });

  it("defaults type to copilot_cli_sdk", () => {
    const path = writeConfig("default-type.json", JSON.stringify({
      agents: [{ name: "Agent", port: 3000, folder: "/work" }],
    }));
    const config = loadConfig(path);
    expect(config.agents[0].type).toBe("copilot_cli_sdk");
  });

  it("trims name and folder", () => {
    const path = writeConfig("trim.json", JSON.stringify({
      agents: [{ name: "  spaced  ", port: 3000, folder: "  /dir  " }],
    }));
    const config = loadConfig(path);
    expect(config.agents[0].name).toBe("spaced");
    expect(config.agents[0].folder).toBe("/dir");
  });

  it("loads multiple agents", () => {
    const path = writeConfig("multi.json", JSON.stringify({
      agents: [
        { name: "Agent A", port: 8001, folder: "/a" },
        { name: "Agent B", type: "acp", command: "run.sh", folder: "/b" },
      ],
    }));
    const config = loadConfig(path);
    expect(config.agents).toHaveLength(2);
  });

  // Error cases

  it("throws on missing file", () => {
    expect(() => loadConfig("/nonexistent/config.json")).toThrow(ConfigValidationError);
  });

  it("throws on invalid JSON", () => {
    const path = writeConfig("bad.json", "not json {{{");
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when root is not an object", () => {
    const path = writeConfig("array.json", "[]");
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when agents key is missing", () => {
    const path = writeConfig("no-agents.json", JSON.stringify({}));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when agents is not an array", () => {
    const path = writeConfig("agents-obj.json", JSON.stringify({ agents: {} }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when agent name is missing", () => {
    const path = writeConfig("no-name.json", JSON.stringify({
      agents: [{ port: 3000, folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when agent name is empty", () => {
    const path = writeConfig("empty-name.json", JSON.stringify({
      agents: [{ name: "   ", port: 3000, folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when folder is missing", () => {
    const path = writeConfig("no-folder.json", JSON.stringify({
      agents: [{ name: "Agent", port: 3000 }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when type is invalid", () => {
    const path = writeConfig("bad-type.json", JSON.stringify({
      agents: [{ name: "Agent", type: "invalid", folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when copilot agent lacks port", () => {
    const path = writeConfig("no-port.json", JSON.stringify({
      agents: [{ name: "Agent", type: "copilot_cli_sdk", folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when copilot agent has invalid port", () => {
    const path = writeConfig("bad-port.json", JSON.stringify({
      agents: [{ name: "Agent", type: "copilot_cli_sdk", port: 70000, folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when ACP agent lacks command", () => {
    const path = writeConfig("no-cmd.json", JSON.stringify({
      agents: [{ name: "Agent", type: "acp", folder: "/work" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });

  it("throws when options is not an object", () => {
    const path = writeConfig("bad-opts.json", JSON.stringify({
      agents: [{ name: "Agent", port: 3000, folder: "/work", options: "bad" }],
    }));
    expect(() => loadConfig(path)).toThrow(ConfigValidationError);
  });
});
