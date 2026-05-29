import type { RollgateClient } from '../api.js';

export const setFlagRolloutToolDefinition = {
  name: 'set_flag_rollout',
  description:
    'Set rollout configuration for a Rollgate flag in a specific environment: percentage rollout, target users, targeting rules, default value, variations. Use toggle_flag_in_environment for simple on/off.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      flag_id: { type: 'string', description: 'Flag UUID.' },
      environment_id: {
        type: 'string',
        description:
          'Environment UUID. Optional — falls back to ROLLGATE_ENV_ID from config.',
      },
      enabled: {
        type: 'boolean',
        description: 'Optional on/off toggle alongside rollout config.',
      },
      rollout: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Percentage rollout (0-100).',
      },
      target_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of user ids to always include (regardless of rollout %).',
      },
      rules: {
        type: 'array',
        items: { type: 'object' },
        description:
          'Targeting rules array. See Rollgate API docs for shape: each rule has conditions[] + variation.',
      },
      default_value: {
        description:
          'Default value for non-boolean flags in this environment. Type must match flag_type.',
      },
    },
    required: ['flag_id'],
    additionalProperties: false,
  },
};

interface SetRolloutArgs {
  flag_id: string;
  environment_id?: string;
  enabled?: boolean;
  rollout?: number;
  target_users?: string[];
  rules?: unknown[];
  default_value?: unknown;
}

export async function setFlagRollout(client: RollgateClient, args: SetRolloutArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  const envId = args.environment_id ?? client.requireEnvScope().envId;
  const { flag_id, environment_id: _, ...body } = args;
  void _;
  return client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags/${flag_id}/environments/${envId}`,
    { method: 'PUT', body },
  );
}
