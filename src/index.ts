#!/usr/bin/env node
/**
 * rollgate-mcp — MCP server for Rollgate feature flags.
 *
 * Day 3 v0.2: 8 tool MVP implementati (ADR scope completo).
 * Day 4: distribuzione coordinata (glama.ai + r/mcp + dev.to + Twitter).
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
import {
  createFeatureFlagToolDefinition,
  createFeatureFlag,
} from './tools/create_feature_flag.js';
import {
  getFeatureFlagToolDefinition,
  getFeatureFlag,
} from './tools/get_feature_flag.js';
import {
  updateFeatureFlagToolDefinition,
  updateFeatureFlag,
} from './tools/update_feature_flag.js';
import {
  deleteFeatureFlagToolDefinition,
  deleteFeatureFlag,
} from './tools/delete_feature_flag.js';
import {
  toggleFlagInEnvironmentToolDefinition,
  toggleFlagInEnvironment,
} from './tools/toggle_flag_in_environment.js';
import {
  setFlagRolloutToolDefinition,
  setFlagRollout,
} from './tools/set_flag_rollout.js';
import {
  detectExistingFlagToolDefinition,
  detectExistingFlag,
} from './tools/detect_existing_flag.js';

async function main() {
  const config = loadConfig();
  const client = new RollgateClient(config);

  const server = new Server(
    { name: 'rollgate-mcp', version: '0.2.0' },
    { capabilities: { tools: {} } },
  );

  const tools = [
    listFeatureFlagsToolDefinition,
    createFeatureFlagToolDefinition,
    getFeatureFlagToolDefinition,
    updateFeatureFlagToolDefinition,
    deleteFeatureFlagToolDefinition,
    toggleFlagInEnvironmentToolDefinition,
    setFlagRolloutToolDefinition,
    detectExistingFlagToolDefinition,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as never;

    try {
      let result: unknown;
      switch (name) {
        case 'list_feature_flags':
          result = await listFeatureFlags(client, a);
          break;
        case 'create_feature_flag':
          result = await createFeatureFlag(client, a);
          break;
        case 'get_feature_flag':
          result = await getFeatureFlag(client, a);
          break;
        case 'update_feature_flag':
          result = await updateFeatureFlag(client, a);
          break;
        case 'delete_feature_flag':
          result = await deleteFeatureFlag(client, a);
          break;
        case 'toggle_flag_in_environment':
          result = await toggleFlagInEnvironment(client, a);
          break;
        case 'set_flag_rollout':
          result = await setFlagRollout(client, a);
          break;
        case 'detect_existing_flag':
          result = await detectExistingFlag(client, a);
          break;
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
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
