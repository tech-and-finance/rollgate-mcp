import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RollgateAPIError, RollgateClient } from '../src/api.js';
import type { RollgateMCPConfig } from '../src/config.js';

const baseConfig: RollgateMCPConfig = {
  apiUrl: 'https://api-test.rollgate.io',
  apiKey: 'rgmcp_testtoken',
  organizationId: 'org-1',
  projectId: 'proj-1',
  environmentId: 'env-1',
};

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  text?: string;
}) {
  const fn = vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: async () => response.text ?? '',
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RollgateClient.request', () => {
  it('invia Authorization Bearer + Accept e parse del JSON', async () => {
    const fetchMock = mockFetch({ text: JSON.stringify({ id: 'flag-1' }) });
    const client = new RollgateClient(baseConfig);

    const result = await client.request<{ id: string }>('/api/v1/ping');

    expect(result).toEqual({ id: 'flag-1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api-test.rollgate.io/api/v1/ping');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer rgmcp_testtoken',
      Accept: 'application/json',
    });
  });

  it('aggiunge Content-Type + serializza body solo quando c’è un body', async () => {
    const fetchMock = mockFetch({ text: '{}' });
    const client = new RollgateClient(baseConfig);

    await client.request('/api/v1/flags', { method: 'POST', body: { key: 'x' } });

    const init = fetchMock.mock.calls[0]![1] as RequestInit & {
      headers: Record<string, string>;
    };
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ key: 'x' }));
  });

  it('non setta Content-Type né body per richieste senza body', async () => {
    const fetchMock = mockFetch({ text: '{}' });
    const client = new RollgateClient(baseConfig);

    await client.request('/api/v1/flags');

    const init = fetchMock.mock.calls[0]![1] as RequestInit & {
      headers: Record<string, string>;
    };
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('ritorna undefined su 204 No Content', async () => {
    mockFetch({ status: 204 });
    const client = new RollgateClient(baseConfig);

    await expect(client.request('/api/v1/flags/x')).resolves.toBeUndefined();
  });

  it('ritorna undefined su body vuoto', async () => {
    mockFetch({ text: '' });
    const client = new RollgateClient(baseConfig);

    await expect(client.request('/api/v1/flags/x')).resolves.toBeUndefined();
  });

  it('rimappa una 2xx con body non-JSON su RollgateAPIError (no SyntaxError grezzo)', async () => {
    mockFetch({ status: 200, text: '<html><body>502 Bad Gateway</body></html>' });
    const client = new RollgateClient(baseConfig);

    const err = await client.request('/api/v1/flags').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RollgateAPIError);
    expect((err as RollgateAPIError).body).toContain('Malformed (non-JSON)');
  });

  it('lancia RollgateAPIError con status + body su risposta non-ok', async () => {
    mockFetch({ ok: false, status: 403, text: 'forbidden: scope flags:rw required' });
    const client = new RollgateClient(baseConfig);

    await expect(client.request('/api/v1/flags')).rejects.toBeInstanceOf(RollgateAPIError);
    await expect(client.request('/api/v1/flags')).rejects.toMatchObject({
      status: 403,
      body: 'forbidden: scope flags:rw required',
    });
  });
});

describe('RollgateClient scope resolvers', () => {
  it('requireProjectScope ritorna org + project dalla config', () => {
    const client = new RollgateClient(baseConfig);
    expect(client.requireProjectScope()).toEqual({ orgId: 'org-1', projectId: 'proj-1' });
  });

  it('requireProjectScope throw se mancano org/project', () => {
    const client = new RollgateClient({
      ...baseConfig,
      organizationId: undefined,
      projectId: undefined,
    });
    expect(() => client.requireProjectScope()).toThrow(/Missing organizationId or projectId/);
  });

  it('requireEnvScope ritorna org + project + env', () => {
    const client = new RollgateClient(baseConfig);
    expect(client.requireEnvScope()).toEqual({
      orgId: 'org-1',
      projectId: 'proj-1',
      envId: 'env-1',
    });
  });

  it('requireEnvScope throw se manca environmentId', () => {
    const client = new RollgateClient({ ...baseConfig, environmentId: undefined });
    expect(() => client.requireEnvScope()).toThrow(/Missing environmentId/);
  });
});
