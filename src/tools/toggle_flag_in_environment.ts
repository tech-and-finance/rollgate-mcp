import type { RollgateClient } from '../api.js';

export const toggleFlagInEnvironmentToolDefinition = {
  name: 'toggle_flag_in_environment',
  description:
    'Toggle a Rollgate feature flag ON or OFF in a specific environment. Server creates flag state if missing. Audit log + history entry created. SSE listeners are notified.',
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
        description: 'true to enable, false to disable.',
      },
    },
    required: ['flag_id', 'enabled'],
    additionalProperties: false,
  },
};

interface ToggleArgs {
  flag_id: string;
  environment_id?: string;
  enabled: boolean;
}

export async function toggleFlagInEnvironment(client: RollgateClient, args: ToggleArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  const envId = args.environment_id ?? client.requireEnvScope().envId;
  return client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags/${args.flag_id}/environments/${envId}/toggle`,
    { method: 'POST', body: { enabled: args.enabled } },
  );
}
