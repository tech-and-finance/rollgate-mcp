import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface RollgateMCPConfig {
  apiUrl: string;
  apiKey: string;
  organizationId?: string;
  projectId?: string;
  environmentId?: string;
}

const DEFAULT_API_URL = 'https://api.rollgate.io';
const CONFIG_PATHS = [
  process.env.ROLLGATE_MCP_CONFIG,
  join(homedir(), '.config', 'rollgate-mcp', 'config.json'),
  join(homedir(), '.rollgate-mcp.json'),
].filter(Boolean) as string[];

/**
 * Carica la config da (in ordine):
 * 1. env vars (ROLLGATE_API_URL / ROLLGATE_API_KEY / ROLLGATE_ORG_ID / etc.)
 * 2. file JSON puntato da $ROLLGATE_MCP_CONFIG
 * 3. ~/.config/rollgate-mcp/config.json
 * 4. ~/.rollgate-mcp.json
 *
 * Le env vars hanno precedenza su file fields. Throws se manca apiKey.
 */
export function loadConfig(): RollgateMCPConfig {
  let fileConfig: Partial<RollgateMCPConfig> = {};

  for (const path of CONFIG_PATHS) {
    if (existsSync(path)) {
      try {
        fileConfig = JSON.parse(readFileSync(path, 'utf-8')) as Partial<RollgateMCPConfig>;
        break;
      } catch (err) {
        throw new Error(
          `Failed to parse Rollgate MCP config at ${path}: ${(err as Error).message}`,
        );
      }
    }
  }

  // .trim() difende dal copy-paste con whitespace/newline finale: senza,
  // un token "rgmcp_xxx \n" passa il check di prefisso ma produce un header
  // `Bearer rgmcp_xxx ` che il backend rifiuta con un 401 poco diagnosticabile.
  const apiKey = (process.env.ROLLGATE_API_KEY ?? fileConfig.apiKey)?.trim();
  if (!apiKey) {
    throw new Error(
      'Missing Rollgate MCP token. Set ROLLGATE_API_KEY env var or add "apiKey" to ~/.config/rollgate-mcp/config.json. ' +
        'Generate a token at https://rollgate.io/settings?tab=mcp-tokens',
    );
  }

  if (!apiKey.startsWith('rgmcp_')) {
    throw new Error(
      `Invalid Rollgate MCP token format (must start with rgmcp_). Got prefix: ${apiKey.slice(0, 6)}...`,
    );
  }

  return {
    apiUrl: process.env.ROLLGATE_API_URL ?? fileConfig.apiUrl ?? DEFAULT_API_URL,
    apiKey,
    organizationId: process.env.ROLLGATE_ORG_ID ?? fileConfig.organizationId,
    projectId: process.env.ROLLGATE_PROJECT_ID ?? fileConfig.projectId,
    environmentId: process.env.ROLLGATE_ENV_ID ?? fileConfig.environmentId,
  };
}
