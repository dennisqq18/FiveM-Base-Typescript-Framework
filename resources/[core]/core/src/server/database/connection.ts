interface DatabaseMetricsSnapshot {
  queries: number;
  failed: number;
  slow: number;
  totalMs: number;
  maxMs: number;
  consecutiveFailures: number;
  circuitOpenUntil: number;
}

const databaseMetrics: DatabaseMetricsSnapshot = {
  queries: 0,
  failed: 0,
  slow: 0,
  totalMs: 0,
  maxMs: 0,
  consecutiveFailures: 0,
  circuitOpenUntil: 0,
};

function oxmysql(): any {
  const ox = (globalThis as any).exports?.oxmysql;
  if (!ox) throw new CoreError('OXMYSQL_UNAVAILABLE', 'oxmysql export is not available.');
  return ox;
}

function databaseLabel(query: string): string {
  return query.replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function runDatabaseCall<T>(query: string, operation: () => Promise<T>): Promise<T> {
  const current = Date.now();
  if (databaseMetrics.circuitOpenUntil > current) throw new CoreError('DATABASE_CIRCUIT_OPEN', 'Database circuit breaker is open.', { retryAfterMs: databaseMetrics.circuitOpenUntil - current });
  const started = performance.now();
  databaseMetrics.queries++;
  let failed = false;
  try {
    const result = await operation();
    databaseMetrics.consecutiveFailures = 0;
    return result;
  } catch (error) {
    failed = true;
    databaseMetrics.failed++;
    databaseMetrics.consecutiveFailures++;
    if (databaseMetrics.consecutiveFailures >= Config.databaseCircuitFailureThreshold) databaseMetrics.circuitOpenUntil = Date.now() + Config.databaseCircuitOpenMs;
    throw error;
  } finally {
    const durationMs = Number((performance.now() - started).toFixed(2));
    databaseMetrics.totalMs += durationMs;
    databaseMetrics.maxMs = Math.max(databaseMetrics.maxMs, durationMs);
    const slow = durationMs >= Config.slowQueryThresholdMs;
    if (slow) databaseMetrics.slow++;
    if (Config.features.queryProfiler) emit('rumble:telemetry:query', { label: databaseLabel(query), durationMs, slow, failed });
  }
}

async function dbQuery<T = any[]>(query: string, params: any[] = []): Promise<T> {
  return await runDatabaseCall(query, async () => await oxmysql().query_async(query, params) as T);
}

async function dbSingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
  return await runDatabaseCall(query, async () => await oxmysql().single_async(query, params) as T | null);
}

async function dbInsert(query: string, params: any[] = []): Promise<number> {
  return await runDatabaseCall(query, async () => Number(await oxmysql().insert_async(query, params)));
}

async function dbUpdate(query: string, params: any[] = []): Promise<number> {
  return await runDatabaseCall(query, async () => Number(await oxmysql().update_async(query, params)));
}

async function dbTransaction(queries: Array<{ query: string; values?: any[] }>): Promise<boolean> {
  if (!Array.isArray(queries) || queries.length === 0) return true;
  const label = `transaction:${queries.length}`;
  return await runDatabaseCall(label, async () => Boolean(await oxmysql().transaction_async(queries.map((entry) => ({ query: entry.query, values: entry.values ?? [] })))));
}

function getDatabaseMetrics(): DatabaseMetricsSnapshot & { averageMs: number } {
  return {
    ...databaseMetrics,
    averageMs: databaseMetrics.queries > 0 ? Number((databaseMetrics.totalMs / databaseMetrics.queries).toFixed(2)) : 0,
  };
}
