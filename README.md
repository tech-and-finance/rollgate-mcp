# Rollgate MCP Server

Manage Rollgate feature flags from Claude Code, Cursor, Codex, Continue, Cline or any [MCP-compatible](https://modelcontextprotocol.io) client.

> Status: **alpha (v0.1, Day 3 scoping)**. 1 tool implemented (`list_feature_flags`) as template. 7 additional tools planned per [ADR](https://github.com/tech-and-finance/rollgate/blob/main/Vault/Decisions/rollgate-mcp-server-design.md).

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

## Tools (v0.1)

| Tool | Description |
|---|---|
| `list_feature_flags` | List flags in the configured project, with optional filters. |

### Roadmap (Day 3 full)

| Tool | Description |
|---|---|
| `create_feature_flag` | Create a new boolean / string / number / json flag. |
| `get_feature_flag` | Get a flag by key or id, optionally with state in a given environment. |
| `update_feature_flag` | Update flag metadata (name, description, tags). |
| `delete_feature_flag` | Delete a flag. |
| `toggle_flag_in_environment` | Toggle a flag on/off in a specific environment. |
| `set_flag_rollout` | Set rollout percentage, target users, or rules. |
| `detect_existing_flag` | Fuzzy-match an intent against existing flags to avoid duplicates. |

## Development

```bash
npm install
npm run dev   # tsx watch mode
npm run build # tsc → dist/
npm test      # TODO (Day 3 full)
```

## License

MIT
