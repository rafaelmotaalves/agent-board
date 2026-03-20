# AgentBoard

A kanban-style task board for AI agents. Create tasks, assign them to AI agents, and watch them plan and execute work in real time — with streaming responses, tool call visibility, and live status updates.

## Features

### Board & Task Management
- **Three-lane kanban** — tasks flow through **Planning → Development → Done**
- **Human-in-the-loop approval** — tasks wait for your sign-off before advancing to the next lane, giving you control between each agent phase
- **Task detail modal** — open any task to see the full agent conversation, streamed live as the agent works
- **Add messages mid-task** — send follow-up instructions to the agent while it is still running
- **Archive tasks** — archive completed or unwanted tasks; toggle archived tasks on/off in the board header
- **Active time tracking** — each task shows a live timer for how long the agent has been actively working
- **Ready for review notifications** — You can optionally get notifications when a task is ready for review.

### Agent Integration
- **Copilot CLI SDK agents** — connect to a locally running GitHub Copilot agent over a port
- **ACP agents** — connect to any agent implementing the [Agent Communication Protocol](https://agentclientprotocol.org)

---

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org) >= 22

```bash
npx @rafaelmotaalves/agent-board
```

**Options**

| Flag | Default | Description |
|------|---------|-------------|
| `--port`, `-p` | `3000` | Port the web server listens on |
| `--config` | — | Path to a JSON file for pre-registering agents (see [Registering Agents](#registering-agents)) |

```bash
# Custom port
npx @rafaelmotaalves/agent-board --port 4000

# With a config file
npx @rafaelmotaalves/agent-board --config ./agents.json

# Both
npx @rafaelmotaalves/agent-board --port 4000 --config ./agents.json
```

---

## Registering Agents

### Via the UI

Click **Agents** in the board header to open the agent panel, then fill in the form to add a new agent.

### Via a config file

Pass `--config` when starting the board to pre-register agents from a JSON file (see [Getting Started](#getting-started)).

#### Config schema

```json
{
  "agents": [
    {
      "name": "My Copilot Agent",
      "type": "copilot_cli_sdk",
      "port": 8000,
      "folder": "/path/to/workspace",
      "options": {
        "parallel_planning": true,
        "parallel_development": true
      }
    },
    {
      "name": "My ACP Agent",
      "type": "acp",
      "command": "python agent.py",
      "folder": "/path/to/project"
    }
  ]
}
```

#### Agent fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name for the agent |
| `type` | No | `copilot_cli_sdk` (default) or `acp` |
| `port` | Yes (CLI) | Port the Copilot CLI headless agent listens on |
| `command` | Yes (ACP) | Shell command to start the ACP agent |
| `folder` | Yes | Working directory the agent operates in |
| `options` | No | Agent behavior settings (see below) |

#### Parallel execution options

By default each agent processes **one task at a time** per queue. If you assign multiple tasks to the same agent, they run sequentially. You can enable parallel execution per queue through the `options` object:

| Option | Default | Description |
|--------|---------|-------------|
| `parallel_planning` | `false` | Allow the agent to plan multiple tasks concurrently |
| `parallel_development` | `false` | Allow the agent to develop multiple tasks concurrently |

For example, to let an agent handle several planning tasks at once but keep development sequential:

```json
{
  "name": "My Agent",
  "type": "copilot_cli_sdk",
  "port": 8000,
  "folder": "/path/to/workspace",
  "options": { "parallel_planning": true }
}
```

> **Note:** Parallel execution works best when the agent's underlying model supports concurrent requests. Enable it only if your agent can handle the additional load.

### Using Copilot CLI
To use Copilot CLI as an agent you can use either the `copilot_cli_sdk` or `acp`. For the `copilot_cli_sdk`, execute:

```
copilot --headless --port 9090
```

And then add the agent with the corresponding port:

```json
{
  "name": "My Copilot Agent",
  "type": "copilot_cli_sdk",
  "port": "9090",
  "folder": "/path/to/project"
}
```

To use the `acp` method, you can just add:


```json
{
  "name": "My ACP Agent",
  "type": "acp",
  "command": "copilot --acp",
  "folder": "/path/to/project"
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions, architecture overview, and the development workflow.
