interface CloudflareD1Response<T> {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    success: boolean;
    results?: T[];
    meta?: { changes?: number };
    error?: string;
  }>;
}

export interface D1QueryResult<T> {
  results: T[];
  changes: number;
}

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export function getD1Config(): D1Config | null {
  const storageBackend = process.env.STORAGE_BACKEND?.trim() || 'local';
  if (storageBackend === 'local') return null;
  if (storageBackend !== 'cloudflare_d1') {
    throw new Error('STORAGE_BACKEND must be either "local" or "cloudflare_d1".');
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      'Cloudflare D1 requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN.'
    );
  }

  return { accountId, databaseId, apiToken };
}

export async function queryD1<T>(
  config: D1Config,
  sql: string,
  params: Array<string | number> = []
): Promise<D1QueryResult<T>> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/d1/database/${encodeURIComponent(config.databaseId)}/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params: params.map(String) }),
    signal: AbortSignal.timeout(15000),
  });

  let payload: CloudflareD1Response<T>;
  try {
    payload = (await response.json()) as CloudflareD1Response<T>;
  } catch {
    throw new Error(`Cloudflare D1 returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok || !payload.success) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(`Cloudflare D1 request failed (${response.status})${message ? `: ${message}` : '.'}`);
  }

  const result = payload.result?.[0];
  if (!result?.success) {
    throw new Error(`Cloudflare D1 query failed: ${result?.error || 'No query result was returned.'}`);
  }

  return {
    results: result.results ?? [],
    changes: result.meta?.changes ?? 0,
  };
}
