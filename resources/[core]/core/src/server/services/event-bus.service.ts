type InternalEventHandler = (...args: any[]) => void | Promise<void>;

class InternalEventBus {
  private readonly handlers = new Map<string, Set<InternalEventHandler>>();

  on(name: string, handler: InternalEventHandler): () => void {
    const set = this.handlers.get(name) ?? new Set<InternalEventHandler>();
    set.add(handler);
    this.handlers.set(name, set);
    return () => {
      const current = this.handlers.get(name);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.handlers.delete(name);
    };
  }

  async emit(name: string, ...args: any[]): Promise<void> {
    const handlers = Array.from(this.handlers.get(name) ?? []);
    if (handlers.length === 0) return;
    await Promise.allSettled(handlers.map((handler) => Promise.resolve(handler(...args))));
  }

  clear(): void {
    this.handlers.clear();
  }
}

const CoreEvents = new InternalEventBus();
