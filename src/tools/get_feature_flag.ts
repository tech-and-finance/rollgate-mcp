import type { RollgateClient } from '../api.js';

export const getFeatureFlagToolDefinition = {
  name: 'get_feature_flag',
  description:
    'Get a Rollgate feature flag by id or key. Returns flag metadata and, if environment_id is provided, the flag state in that environment (enabled, rollout, targeting rules).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      flag_id: {
        type: 'string',
        description: 'Flag UUID. Provide either flag_id or key.',
      },
      key: {
        type: 'string',
        description:
          'Flag key (e.g. `new_checkout_flow`). Resolved via list+filter when flag_id is not provided.',
      },
      environment_id: {
        type: 'string',
        description:
          'Optional environment UUID. If provided, the response includes the flag state in that environment.',
      },
    },
    additionalProperties: false,
  },
};

interface GetFlagArgs {
  flag_id?: string;
  key?: string;
  environment_id?: string;
}

interface FlagListItem {
  id: string;
  key: string;
  name: string;
}

export async function getFeatureFlag(client: RollgateClient, args: GetFlagArgs) {
  const { orgId, projectId } = client.requireProjectScope();

  let flagId = args.flag_id;
  if (!flagId) {
    if (!args.key) {
      throw new Error('Either flag_id or key is required.');
    }
    const list = await client.request<{ flags: FlagListItem[] }>(
      `/api/v1/organizations/${orgId}/projects/${projectId}/flags?search=${encodeURIComponent(args.key)}`,
    );
    const match = (list.flags ?? []).find((f) => f.key === args.key);
    if (!match) {
      throw new Error(`Flag with key "${args.key}" not found in project.`);
    }
    flagId = match.id;
  }

  const query = args.environment_id
    ? `?environment_id=${encodeURIComponent(args.environment_id)}`
    : '';
  return client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags/${flagId}${query}`,
  );
}
