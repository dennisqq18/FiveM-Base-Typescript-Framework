class SecurityLayer {
  private readonly limits = new Map<string, { startedAt: number; count: number }>();
  private readonly reports = new Map<string, number>();

  allow(source: number, key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const id = `${source}:${key}`;
    const current = this.limits.get(id);
    if (!current || now - current.startedAt >= windowMs) {
      this.limits.set(id, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= limit) return false;
    current.count++;
    return true;
  }

  shouldReport(source: number, key: string): boolean {
    const now = Date.now();
    const id = `${source}:${key}`;
    const previous = this.reports.get(id) ?? 0;
    if (now - previous < Config.securityLogWindowMs) return false;
    this.reports.set(id, now);
    return true;
  }

  validatePayload(payload: any, maximumBytes: number = Config.maxRpcPayloadBytes): boolean {
    return serializedSize(payload) <= maximumBytes;
  }

  validateMoney(amount: any): boolean {
    const value = Number(amount);
    return Number.isSafeInteger(value) && value >= 0;
  }

  validateItemAmount(amount: any): boolean {
    const value = Number(amount);
    return Number.isSafeInteger(value) && value > 0 && value <= Config.maxItemOperation;
  }

  clearSource(source: number): void {
    for (const key of Array.from(this.limits.keys())) if (key.startsWith(`${source}:`)) this.limits.delete(key);
    for (const key of Array.from(this.reports.keys())) if (key.startsWith(`${source}:`)) this.reports.delete(key);
  }
}

const Security = new SecurityLayer();
