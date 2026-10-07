interface IdempotencyRecord {
  expiresAt: number;
  success: boolean;
  result: any;
  error: string | null;
}

class IdempotencyService {
  private readonly records = new Map<string, IdempotencyRecord>();

  get(key: string): IdempotencyRecord | null {
    const record = this.records.get(key);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return null;
    }
    return record;
  }

  set(key: string, success: boolean, result: any, error: string | null): void {
    this.records.set(key, { expiresAt: Date.now() + Config.rpcIdempotencyTtlMs, success, result, error });
    if (this.records.size > 2048) this.cleanup();
  }

  clearSource(source: number): void {
    const prefix = `${source}:`;
    for (const key of this.records.keys()) if (key.startsWith(prefix)) this.records.delete(key);
  }

  cleanup(): void {
    const current = Date.now();
    for (const [key, record] of this.records) if (record.expiresAt <= current) this.records.delete(key);
  }
}

const RpcIdempotency = new IdempotencyService();
