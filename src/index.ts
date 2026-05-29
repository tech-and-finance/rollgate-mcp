#!/usr/bin/env node
/**
 * rollgate-mcp — MCP server for Rollgate feature flags.
 *
 * Day 3 v0.1: scaffold + 1 tool implementato (list_feature_flags) come
 * template. I 7 tool restanti dell'ADR scoping (vedi
 * Vault/Decisions/rollgate-mcp-server-design.md) seguono lo stesso pattern.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { RollgateClient } from './api.js';
import {
  listFeatureFlagsToolDefinition,
  listFeatureFlags,
} from './tools/list_feature_flags.js';

async function main() {
  const config = loadConfig();
  const client = new RollgateClient(config);

  const server = new Server(
    {
      name: 'rollgate-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const tools = [listFeatureFlagsToolDefinition];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_feature_flags': {
          const result = await listFeatureFlags(client, (args ?? {}) as never);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [
          { type: 'text', text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
