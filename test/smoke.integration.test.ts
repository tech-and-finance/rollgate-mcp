import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RollgateClient } from '../src/api.js';
import { loadConfig } from '../src/config.js';
import { createFeatureFlag } from '../src/tools/create_feature_flag.js';
import { getFeatureFlag } from '../src/tools/get_feature_flag.js';
import { listFeatureFlags } from '../src/tools/list_feature_flags.js';
import { toggleFlagInEnvironment } from '../src/tools/toggle_flag_in_environment.js';
import { deleteFeatureFlag } from '../src/tools/delete_feature_flag.js';

const envId = process.env.ROLLGATE_ENV_ID!;

interface FlagWithState {
  state?: { enabled?: boolean };
}

/**
 * Smoke integration end-to-end contro un Rollgate reale (staging consigliato).
 *
 * Gira SOLO se sono presenti tutte le env vars:
 *   ROLLGATE_API_KEY (rgmcp_*), ROLLGATE_API_URL, ROLLGATE_ORG_ID,
 *   ROLLGATE_PROJECT_ID, ROLLGATE_ENV_ID
 * Altrimenti l'intero blocco si auto-skippa (unit suite resta verde senza credenziali).
 *
 * Crea un flag throwaway → get → list → toggle → delete, ripulendo sempre.
 */
const hasCreds = Boolean(
  process.env.ROLLGATE_API_KEY &&
    process.env.ROLLGATE_ORG_ID &&
    process.env.ROLLGATE_PROJECT_ID &&
    process.env.ROLLGATE_ENV_ID,
);

const uniqueKey = `mcp_smoke_${Date.now().toString(36)}`;

describe.runIf(hasCreds)('smoke integration — real Rollgate', () => {
  // Lazy: loadConfig() solo quando la suite gira davvero (con runIf(false)
  // il factory del describe viene comunque eseguito in fase di collection,
  // quindi non possiamo chiamare loadConfig al top-level del body).
  let client: RollgateClient;
  let createdFlagId: string | undefined;

  beforeAll(() => {
    client = new RollgateClient(loadConfig());
  });

  afterAll(async () => {
    if (createdFlagId) {
      try {
        await deleteFeatureFlag(client, { flag_id: createdFlagId });
      } catch {
        // cleanup best-effort: il flag throwaway potrebbe essere già rimosso
      }
    }
  });

  it('create_feature_flag → ritorna un flag con id', async () => {
    const flag = (await createFeatureFlag(client, {
      key: uniqueKey,
      name: 'MCP smoke test',
      description: 'throwaway flag created by rollgate-mcp integration smoke test',
      flag_type: 'boolean',
    })) as { id?: string; key?: string };

    expect(flag).toBeTruthy();
    expect(flag.id).toBeTruthy();
    createdFlagId = flag.id;
  });

  it('get_feature_flag → recupera per id', async () => {
    expect(createdFlagId).toBeTruthy();
    const flag = (await getFeatureFlag(client, { flag_id: createdFlagId! })) as { id?: string };
    expect(flag.id).toBe(createdFlagId);
  });

  it('list_feature_flags → include il flag appena creato', async () => {
    const res = await listFeatureFlags(client, { search: uniqueKey });
    expect(res.flags.some((f) => f.key === uniqueKey)).toBe(true);
  });

  it('toggle_flag_in_environment → lo stato letto riflette davvero il cambio', async () => {
    expect(createdFlagId).toBeTruthy();

    // ON → read-back enabled=true (esclude un toggle no-op che risponde 200)
    await toggleFlagInEnvironment(client, { flag_id: createdFlagId!, enabled: true });
    const afterOn = (await getFeatureFlag(client, {
      flag_id: createdFlagId!,
      environment_id: envId,
    })) as FlagWithState;
    expect(afterOn.state?.enabled).toBe(true);

    // OFF → read-back enabled=false (conferma che lo stato è realmente mutabile)
    await toggleFlagInEnvironment(client, { flag_id: createdFlagId!, enabled: false });
    const afterOff = (await getFeatureFlag(client, {
      flag_id: createdFlagId!,
      environment_id: envId,
    })) as FlagWithState;
    expect(afterOff.state?.enabled).toBe(false);
  });

  it('delete_feature_flag → rimuove il flag throwaway', async () => {
    expect(createdFlagId).toBeTruthy();
    const res = await deleteFeatureFlag(client, { flag_id: createdFlagId! });
    expect(res).toEqual({ deleted: true, flag_id: createdFlagId });
    createdFlagId = undefined; // già pulito, evita doppia delete in afterAll
  });
});
