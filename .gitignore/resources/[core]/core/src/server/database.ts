function oxmysql(): any {
  const ox = (globalThis as any).exports?.oxmysql;
  if (!ox) throw new CoreError('OXMYSQL_UNAVAILABLE', 'oxmysql export is not available.');
  return ox;
}

async function dbQuery<T = any[]>(query: string, params: any[] = []): Promise<T> {
  return await oxmysql().query_async(query, params) as T;
}

async function dbSingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
  return await oxmysql().single_async(query, params) as T | null;
}

async function dbInsert(query: string, params: any[] = []): Promise<number> {
  return Number(await oxmysql().insert_async(query, params));
}

async function dbUpdate(query: string, params: any[] = []): Promise<number> {
  return Number(await oxmysql().update_async(query, params));
}
