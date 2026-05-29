import type { RollgateClient } from '../api.js';

/**
 * Template tool implementation. Il MCP server entry-point (src/index.ts)
 * registrerà i tool tramite questo pattern. Day 3 v0.1 implementa
 * `list_feature_flags`; gli altri 7 tool ADR seguono lo stesso shape.
 */
export const listFeatureFlagsToolDefinition = {
  name: 'list_feature_flags',
  description:
    'List Rollgate feature flags for the configured project. Optionally filter by tag, status, or search term. Returns flag id, key, name, description, type, tags.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      search: {
        type: 'string',
        description: 'Optional fuzzy search across flag key/name/description.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of tags to filter by (AND match).',
      },
      status: {
        type: 'string',
        enum: ['active', 'archived'],
        description: 'Optional flag status filter.',
      },
    },
    additionalProperties: false,
  },
};

interface ListFlagsArgs {
  search?: string;
  tags?: string[];
  status?: 'active' | 'archived';
}

interface FlagResponse {
  id: string;
  key: string;
  name: string;
  description?: string;
  flag_type: string;
  tags?: string[];
  created_at: string;
}

export async function listFeatureFlags(
  client: RollgateClient,
  args: ListFlagsArgs,
): Promise<{ flags: FlagResponse[]; count: number }> {
  const { orgId, projectId } = client.requireProjectScope();
  const params = new URLSearchParams();
  if (args.search) params.set('search', args.search);
  if (args.tags?.length) params.set('tags', args.tags.join(','));
  if (args.status) params.set('status', args.status);
  const query = params.toString() ? `?${params.toString()}` : '';

  const data = await client.request<{ flags: FlagResponse[] }>(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags${query}`,
  );

  return { flags: data.flags ?? [], count: data.flags?.length ?? 0 };
}
