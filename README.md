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

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
bunx @rafaelmotaalves/agent-board
```

**Options**

| Flag | Default | Description |
|------|---------|-------------|
| `--port`, `-p` | `3000` | Port the web server listens on |
| `--config` | — | Path to a JSON file for pre-registering agents (see [Registering Agents](#registering-agents)) |

```bash
# Custom port
bunx @rafaelmotaalves/agent-board --port 4000

# With a config file
bunx @rafaelmotaalves/agent-board --config ./agents.json

# Both
bunx @rafaelmotaalves/agent-board --port 4000 --config ./agents.json
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
      "options": { "parallel_planning": true }
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
