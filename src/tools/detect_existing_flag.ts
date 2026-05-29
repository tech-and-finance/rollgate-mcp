import type { RollgateClient } from '../api.js';

export const detectExistingFlagToolDefinition = {
  name: 'detect_existing_flag',
  description:
    'Search for existing Rollgate flags that may already cover an intent / use case, before creating a new flag. Returns candidate matches with id, key, name, description, tags. The LLM client is responsible for picking the best fuzzy match against the user intent.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      intent: {
        type: 'string',
        description:
          'Free-text description of the desired flag (e.g. "experiment with the new checkout flow on iOS"). The MCP server forwards this as a search query to Rollgate; the LLM picks the best match from the returned candidates.',
      },
    },
    required: ['intent'],
    additionalProperties: false,
  },
};

interface DetectArgs {
  intent: string;
}

export async function detectExistingFlag(client: RollgateClient, args: DetectArgs) {
  const { orgId, projectId } = client.requireProjectScope();
  const params = new URLSearchParams();
  params.set('search', args.intent);
  return client.request<{ flags: unknown[] }>(
    `/api/v1/organizations/${orgId}/projects/${projectId}/flags?${params.toString()}`,
  );
}
