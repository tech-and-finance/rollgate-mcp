import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// node:fs è mockato per controllare presenza/contenuto del config file
// indipendentemente dal filesystem reale della macchina che esegue i test.
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}));

import { existsSync, readFileSync } from 'node:fs';
import { loadConfig } from '../src/config.js';

const existsMock = vi.mocked(existsSync);
const readMock = vi.mocked(readFileSync);

beforeEach(() => {
  existsMock.mockReset().mockReturnValue(false);
  readMock.mockReset().mockReturnValue('');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadConfig — env vars', () => {
  it('legge token + url da env e applica default url quando assente', () => {
    vi.stubEnv('ROLLGATE_API_KEY', 'rgmcp_abc123');
    vi.stubEnv('ROLLGATE_API_URL', undefined);

    const cfg = loadConfig();
    expect(cfg.apiKey).toBe('rgmcp_abc123');
    expect(cfg.apiUrl).toBe('https://api.rollgate.io');
  });

  it('usa ROLLGATE_API_URL custom quando presente', () => {
    vi.stubEnv('ROLLGATE_API_KEY', 'rgmcp_abc123');
    vi.stubEnv('ROLLGATE_API_URL', 'https://api-staging.rollgate.io');

    expect(loadConfig().apiUrl).toBe('https://api-staging.rollgate.io');
  });

  it('mappa org/project/env da env vars', () => {
    vi.stubEnv('ROLLGATE_API_KEY', 'rgmcp_abc123');
    vi.stubEnv('ROLLGATE_ORG_ID', 'org-1');
    vi.stubEnv('ROLLGATE_PROJECT_ID', 'proj-1');
    vi.stubEnv('ROLLGATE_ENV_ID', 'env-1');

    const cfg = loadConfig();
    expect(cfg.organizationId).toBe('org-1');
    expect(cfg.projectId).toBe('proj-1');
    expect(cfg.environmentId).toBe('env-1');
  });
});

describe('loadConfig — validazione', () => {
  it('throw se manca apiKey (no env, no file)', () => {
    expect(() => loadConfig()).toThrow(/Missing Rollgate MCP token/);
  });

  it('throw se il token non ha prefisso rgmcp_', () => {
    vi.stubEnv('ROLLGATE_API_KEY', 'rg_live_wrongprefix');
    expect(() => loadConfig()).toThrow(/must start with rgmcp_/);
  });
});

describe('loadConfig — file + precedenza env', () => {
  it('legge apiKey/apiUrl dal file JSON quando le env non ci sono', () => {
    existsMock.mockReturnValue(true);
    readMock.mockReturnValue(
      JSON.stringify({ apiKey: 'rgmcp_fromfile', apiUrl: 'https://file.example' }),
    );

    const cfg = loadConfig();
    expect(cfg.apiKey).toBe('rgmcp_fromfile');
    expect(cfg.apiUrl).toBe('https://file.example');
  });

  it('env vince sul file per gli stessi campi', () => {
    existsMock.mockReturnValue(true);
    readMock.mockReturnValue(
      JSON.stringify({ apiKey: 'rgmcp_fromfile', apiUrl: 'https://file.example' }),
    );
    vi.stubEnv('ROLLGATE_API_KEY', 'rgmcp_fromenv');
    vi.stubEnv('ROLLGATE_API_URL', 'https://env.example');

    const cfg = loadConfig();
    expect(cfg.apiKey).toBe('rgmcp_fromenv');
    expect(cfg.apiUrl).toBe('https://env.example');
  });

  it('rilancia un errore leggibile se il file JSON è malformato', () => {
    existsMock.mockReturnValue(true);
    readMock.mockReturnValue('{ not valid json');

    expect(() => loadConfig()).toThrow(/Failed to parse Rollgate MCP config/);
  });
});
