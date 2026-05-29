import type { RollgateClient } from '../api.js';

export const createFeatureFlagToolDefinition = {
  name: 'create_feature_flag',
  description:
    'Create a new Rollgate feature flag in the configured project. Supports boolean, string, number, json flags. Returns the created flag with id, key, urls.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      key: {
        type: 'string',
        description:
          'Unique key for the flag within the project (snake_case recommended, e.g. `new_checkout_flow`).',
      },
      name: { type: 'string', description: 'Human-readable display name.' },
      description: { type: 'string', description: 'Optional description (markdown OK).' },
      flag_type: {
        type: 'string',
        enum: ['boolean', 'string', 'number', 'json'],
        description: 'Flag value type. Default: boolean.',
      },
      category: {
        type: 'string',
        enum: ['release', 'experiment', 'kill_switch', 'ops'],
        description: 'Optional flag category. Default: release.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tag list.',
      },
      default_value: {
        description:
          'Default value for non-boolean flags. Type must match flag_type (string|number|object).',
      },
    },
    required: ['key', 'name'],
    additionalProperties: false,
  },
};

interface CreateFlagArgs {
  key: string;
  name: string;
  description?: string;
  flag_type?: 'boolean' | 'string' | 'number' | 'json';
  category?: 'release' | 'experiment' | 'kill_switch' | 'ops';
  tags?: string[];
  default_value?: unknown;
}

export async function createFeatureFlag(client: RollgateClient, args: CreateFlagArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  return client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags`,
    { method: 'POST', body: args },
  );
}
