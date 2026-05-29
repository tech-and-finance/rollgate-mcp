import type { RollgateMCPConfig } from './config.js';

export class RollgateAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Rollgate API ${status}: ${body}`);
  }
}

export class RollgateClient {
  constructor(private readonly config: RollgateMCPConfig) {}

  async request<T = unknown>(
    path: string,
    init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const { body, method, headers: customHeaders } = init;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      Accept: 'application/json',
      ...(customHeaders ?? {}),
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const url = `${this.config.apiUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new RollgateAPIError(response.status, text);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  // Helpers per scope-resolution: il middleware backend RequireMCPToken
  // popola il user_id in context, ma le route flag richiedono orgId/projectId
  // espliciti nel path. Il config può fornirli o il MCP server li resolve
  // chiedendo all'utente / lookup default. v0.1: rely sulla config.
  requireProjectScope(): { orgId: string; projectId: string } {
    if (!this.config.organizationId || !this.config.projectId) {
      throw new Error(
        'Missing organizationId or projectId in config. Set ROLLGATE_ORG_ID + ROLLGATE_PROJECT_ID env vars or add to config.json.',
      );
    }
    return {
      orgId: this.config.organizationId,
      projectId: this.config.projectId,
    };
  }

  requireEnvScope(): { orgId: string; projectId: string; envId: string } {
    const project = this.requireProjectScope();
    if (!this.config.environmentId) {
      throw new Error(
        'Missing environmentId in config. Set ROLLGATE_ENV_ID env var or add to config.json.',
      );
    }
    return { ...project, envId: this.config.environmentId };
  }
}
