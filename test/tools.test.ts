import { describe, expect, it, vi } from 'vitest';
import type { RollgateClient } from '../src/api.js';

import { createFeatureFlag } from '../src/tools/create_feature_flag.js';
import { listFeatureFlags } from '../src/tools/list_feature_flags.js';
import { getFeatureFlag } from '../src/tools/get_feature_flag.js';
import { updateFeatureFlag } from '../src/tools/update_feature_flag.js';
import { deleteFeatureFlag } from '../src/tools/delete_feature_flag.js';
import { toggleFlagInEnvironment } from '../src/tools/toggle_flag_in_environment.js';
import { setFlagRollout } from '../src/tools/set_flag_rollout.js';
import { detectExistingFlag } from '../src/tools/detect_existing_flag.js';

interface RequestCall {
  path: string;
  init?: { method?: string; body?: unknown };
}

/**
 * Costruisce un RollgateClient fittizio che registra le chiamate `request`
 * e ritorna `responses` in sequenza. Scope resolver hardcoded org/proj/env.
 */
function makeClient(responses: unknown[] = [{}]) {
  const calls: RequestCall[] = [];
  let i = 0;
  const request = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
    calls.push({ path, init });
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r;
  });
  const client = {
    request,
    requireProjectScope: () => ({ orgId: 'org-1', projectId: 'proj-1' }),
    requireEnvScope: () => ({ orgId: 'org-1', projectId: 'proj-1', envId: 'env-1' }),
  } as unknown as RollgateClient;
  return { client, calls };
}

const FLAGS_BASE = '/api/v1/organizations/org-1/projects/proj-1/flags';

describe('create_feature_flag', () => {
  it('POST sul path flags con args come body', async () => {
    const { client, calls } = makeClient([{ id: 'flag-1', key: 'new_flow' }]);
    await createFeatureFlag(client, { key: 'new_flow', name: 'New Flow', flag_type: 'boolean' });

    expect(calls[0]!.path).toBe(FLAGS_BASE);
    expect(calls[0]!.init?.method).toBe('POST');
    expect(calls[0]!.init?.body).toEqual({
      key: 'new_flow',
      name: 'New Flow',
      flag_type: 'boolean',
    });
  });
});

describe('list_feature_flags', () => {
  it('GET senza query quando nessun filtro, normalizza count', async () => {
    const { client, calls } = makeClient([{ flags: [{ id: '1' }, { id: '2' }] }]);
    const res = await listFeatureFlags(client, {});

    expect(calls[0]!.path).toBe(FLAGS_BASE);
    expect(res.count).toBe(2);
  });

  it('serializza search, tags (join virgola), status come query params', async () => {
    const { client, calls } = makeClient([{ flags: [] }]);
    await listFeatureFlags(client, {
      search: 'checkout',
      tags: ['ios', 'beta'],
      status: 'active',
    });

    expect(calls[0]!.path).toContain('search=checkout');
    expect(calls[0]!.path).toContain('tags=ios%2Cbeta');
    expect(calls[0]!.path).toContain('status=active');
  });

  it('count = 0 e array vuoto se il backend non ritorna flags', async () => {
    const { client } = makeClient([{}]);
    const res = await listFeatureFlags(client, {});
    expect(res).toEqual({ flags: [], count: 0 });
  });
});

describe('get_feature_flag', () => {
  it('usa flag_id diretto senza lookup quando fornito', async () => {
    const { client, calls } = makeClient([{ id: 'flag-1' }]);
    await getFeatureFlag(client, { flag_id: 'flag-1' });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1`);
  });

  it('risolve per key via list+filter, poi GET sul flag trovato', async () => {
    const { client, calls } = makeClient([
      { flags: [{ id: 'flag-9', key: 'new_flow', name: 'X' }] },
      { id: 'flag-9' },
    ]);
    await getFeatureFlag(client, { key: 'new_flow' });

    expect(calls[0]!.path).toContain('search=new_flow');
    expect(calls[1]!.path).toBe(`${FLAGS_BASE}/flag-9`);
  });

  it('throw se la key non matcha nessun flag', async () => {
    const { client } = makeClient([{ flags: [{ id: 'x', key: 'altro', name: 'Y' }] }]);
    await expect(getFeatureFlag(client, { key: 'inesistente' })).rejects.toThrow(/not found/);
  });

  it('throw se né flag_id né key forniti', async () => {
    const { client } = makeClient();
    await expect(getFeatureFlag(client, {})).rejects.toThrow(/flag_id or key is required/);
  });

  it('appende environment_id come query quando fornito', async () => {
    const { client, calls } = makeClient([{ id: 'flag-1' }]);
    await getFeatureFlag(client, { flag_id: 'flag-1', environment_id: 'env-2' });
    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1?environment_id=env-2`);
  });
});

describe('update_feature_flag', () => {
  it('PUT sul flag, body senza flag_id', async () => {
    const { client, calls } = makeClient([{ id: 'flag-1' }]);
    await updateFeatureFlag(client, { flag_id: 'flag-1', name: 'Rinominato', tags: ['x'] });

    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1`);
    expect(calls[0]!.init?.method).toBe('PUT');
    expect(calls[0]!.init?.body).toEqual({ name: 'Rinominato', tags: ['x'] });
    expect((calls[0]!.init?.body as Record<string, unknown>).flag_id).toBeUndefined();
  });
});

describe('delete_feature_flag', () => {
  it('DELETE sul flag e ritorna conferma', async () => {
    const { client, calls } = makeClient([undefined]);
    const res = await deleteFeatureFlag(client, { flag_id: 'flag-1' });

    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1`);
    expect(calls[0]!.init?.method).toBe('DELETE');
    expect(res).toEqual({ deleted: true, flag_id: 'flag-1' });
  });
});

describe('toggle_flag_in_environment', () => {
  it('POST su /toggle con body enabled, usando environment_id esplicito', async () => {
    const { client, calls } = makeClient([{ enabled: true }]);
    await toggleFlagInEnvironment(client, {
      flag_id: 'flag-1',
      environment_id: 'env-7',
      enabled: true,
    });

    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1/environments/env-7/toggle`);
    expect(calls[0]!.init?.method).toBe('POST');
    expect(calls[0]!.init?.body).toEqual({ enabled: true });
  });

  it('fallback su env di config quando environment_id assente', async () => {
    const { client, calls } = makeClient([{ enabled: false }]);
    await toggleFlagInEnvironment(client, { flag_id: 'flag-1', enabled: false });

    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1/environments/env-1/toggle`);
  });
});

describe('set_flag_rollout', () => {
  it('PUT su environment, body senza flag_id/environment_id', async () => {
    const { client, calls } = makeClient([{ rollout: 25 }]);
    await setFlagRollout(client, {
      flag_id: 'flag-1',
      environment_id: 'env-3',
      rollout: 25,
      target_users: ['u1'],
    });

    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1/environments/env-3`);
    expect(calls[0]!.init?.method).toBe('PUT');
    const body = calls[0]!.init?.body as Record<string, unknown>;
    expect(body).toEqual({ rollout: 25, target_users: ['u1'] });
    expect(body.flag_id).toBeUndefined();
    expect(body.environment_id).toBeUndefined();
  });

  it('fallback su env di config quando environment_id assente', async () => {
    const { client, calls } = makeClient([{ rollout: 50 }]);
    await setFlagRollout(client, { flag_id: 'flag-1', rollout: 50 });
    expect(calls[0]!.path).toBe(`${FLAGS_BASE}/flag-1/environments/env-1`);
  });
});

describe('detect_existing_flag', () => {
  it('GET con intent come search query', async () => {
    const { client, calls } = makeClient([{ flags: [] }]);
    await detectExistingFlag(client, { intent: 'new checkout flow on iOS' });

    expect(calls[0]!.path).toContain('search=new+checkout+flow+on+iOS');
  });
});
