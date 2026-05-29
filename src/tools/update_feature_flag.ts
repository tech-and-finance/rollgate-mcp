import type { RollgateClient } from '../api.js';

export const updateFeatureFlagToolDefinition = {
  name: 'update_feature_flag',
  description:
    'Update Rollgate feature flag metadata (name, description, category, tags). Does NOT change rollout state — use toggle_flag_in_environment or set_flag_rollout for that.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      flag_id: { type: 'string', description: 'Flag UUID.' },
      name: { type: 'string' },
      description: { type: 'string' },
      category: {
        type: 'string',
        enum: ['release', 'experiment', 'kill_switch', 'ops'],
      },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['flag_id'],
    additionalProperties: false,
  },
};

interface UpdateFlagArgs {
  flag_id: string;
  name?: string;
  description?: string;
  category?: 'release' | 'experiment' | 'kill_switch' | 'ops';
  tags?: string[];
}

export async function updateFeatureFlag(client: RollgateClient, args: UpdateFlagArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  const { flag_id, ...body } = args;
  return client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags/${flag_id}`,
    { method: 'PUT', body },
  );
}
