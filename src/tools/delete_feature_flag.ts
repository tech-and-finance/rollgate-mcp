import type { RollgateClient } from '../api.js';

export const deleteFeatureFlagToolDefinition = {
  name: 'delete_feature_flag',
  description:
    'Permanently delete a Rollgate feature flag. This action cannot be undone. Audit log entry is created server-side.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      flag_id: { type: 'string', description: 'Flag UUID.' },
    },
    required: ['flag_id'],
    additionalProperties: false,
  },
};

interface DeleteFlagArgs {
  flag_id: string;
}

export async function deleteFeatureFlag(client: RollgateClient, args: DeleteFlagArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  await client.request(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags/${args.flag_id}`,
    { method: 'DELETE' },
  );
  return { deleted: true, flag_id: args.flag_id };
}
