class PlayerCache<T extends { source: number }> {
  private readonly entries = new Map<number, T>();

  get size(): number {
    return this.entries.size;
  }

  has(source: number): boolean {
    return this.entries.has(source);
  }

  get(source: number): T | undefined {
    return this.entries.get(source);
  }

  set(source: number, value: T): this {
    this.entries.set(source, value);
    return this;
  }

  delete(source: number): boolean {
    return this.entries.delete(source);
  }

  values(): IterableIterator<T> {
    return this.entries.values();
  }

  [Symbol.iterator](): IterableIterator<[number, T]> {
    return this.entries[Symbol.iterator]();
  }

  find(predicate: (value: T) => boolean): T | undefined {
    for (const value of this.entries.values()) if (predicate(value)) return value;
    return undefined;
  }

  snapshot(): T[] {
    return Array.from(this.entries.values());
  }
}
