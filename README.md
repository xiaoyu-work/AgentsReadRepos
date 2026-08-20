# Agent-Readable Repository MCP

## Why

Coding agents waste context discovering architecture and deciding which files
matter. This MCP server gives an agent the migration rules, one migration task
at a time, automatic repository-map generation, and final conformance auditing.
Users do not need to copy `CODING_AGENT_PROMPT.md`.

## How to Use

Install dependencies with Node.js 20 or later:

```console
npm install
```

Register this stdio server in an MCP client:

```json
{
  "mcpServers": {
    "agent-readable-repository": {
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\mcp-server.mjs",
        "--root",
        "C:\\path\\to\\target-repository"
      ]
    }
  }
}
```

Then tell the connected coding agent:

```text
Make this repository agent-readable.
```

The agent should call `start_migration`, repeatedly call
`next_migration_task`, call `generate_repository_map` when instructed, return
to `next_migration_task`, and call `audit_repository` once for the final report.
`CODING_AGENT_PROMPT.md` remains available as an MCP Prompt and as a fallback
for clients without MCP support.

## How to Validate

Inspect the MCP server interactively:

```console
npx @modelcontextprotocol/inspector node mcp-server.mjs --root PATH_TO_REPOSITORY
```

The standalone auditor is also available:

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY --generate-map
node check-agent-readability.mjs PATH_TO_REPOSITORY
```

A repository passes with at least 85 points and no `error` findings.
