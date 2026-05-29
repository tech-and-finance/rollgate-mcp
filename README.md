# Rollgate MCP Server

Manage Rollgate feature flags from Claude Code, Cursor, Codex, Continue, Cline or any [MCP-compatible](https://modelcontextprotocol.io) client.

> Status: **beta (v0.2, Day 3 full)**. 8 MVP tools implemented per ADR scope. Day 4 = npm publish + distribuzione (glama.ai + r/mcp + dev.to).

## Quickstart

### 1. Generate an MCP token

Go to https://rollgate.io/settings?tab=mcp-tokens and create a token. Copy it (you'll only see it once).

### 2. Configure your MCP client

#### Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "rollgate": {
      "command": "npx",
      "args": ["-y", "rollgate-mcp"],
      "env": {
        "ROLLGATE_API_KEY": "rgmcp_xxx...",
        "ROLLGATE_ORG_ID": "your-org-uuid",
        "ROLLGATE_PROJECT_ID": "your-project-uuid",
        "ROLLGATE_ENV_ID": "your-env-uuid"
      }
    }
  }
}
```

#### Cursor / Continue / Cline

Same pattern, see their docs for the MCP server config location.

### 3. Try a tool

In your MCP client, ask: "List my Rollgate feature flags." The model will call `list_feature_flags` and you'll see the results inline.

## Configuration

Config is loaded from (in order, env vars take precedence):

1. Env vars: `ROLLGATE_API_KEY`, `ROLLGATE_API_URL`, `ROLLGATE_ORG_ID`, `ROLLGATE_PROJECT_ID`, `ROLLGATE_ENV_ID`
2. JSON file at `$ROLLGATE_MCP_CONFIG`
3. `~/.config/rollgate-mcp/config.json`
4. `~/.rollgate-mcp.json`

Example config file:

```json
{
  "apiKey": "rgmcp_xxx...",
  "apiUrl": "https://api.rollgate.io",
  "organizationId": "...",
  "projectId": "...",
  "environmentId": "..."
}
```

## Tools (v0.2 — 8 MVP)

| Tool | Description |
|---|---|
| `list_feature_flags` | List flags in the configured project, with optional filters (search, tags, status). |
| `create_feature_flag` | Create a new boolean / string / number / json flag. |
| `get_feature_flag` | Get a flag by id or key, optionally with state in a given environment. |
| `update_feature_flag` | Update flag metadata (name, description, category, tags). |
| `delete_feature_flag` | Delete a flag permanently. |
| `toggle_flag_in_environment` | Toggle a flag ON/OFF in a specific environment. |
| `set_flag_rollout` | Set rollout percentage, target users, or targeting rules in an environment. |
| `detect_existing_flag` | Search existing flags by intent before creating duplicates. |

## Development

```bash
npm install
npm run dev   # tsx watch mode
npm run build # tsc → dist/
npm test      # TODO (Day 3 full)
```

## License

MIT
