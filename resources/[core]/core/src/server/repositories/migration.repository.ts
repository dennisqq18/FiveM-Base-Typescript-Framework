class MigrationRepository {
  async exists(version: number): Promise<boolean> {
    return Boolean(await dbSingle<any>('SELECT version FROM rumble_migrations WHERE version = ? LIMIT 1', [version]));
  }

  async record(version: number, name: string, checksum: string | null = null): Promise<void> {
    await dbQuery('INSERT IGNORE INTO rumble_migrations (version, name, checksum) VALUES (?, ?, ?)', [version, name, checksum]);
  }

  async latest(): Promise<number> {
    const row = await dbSingle<any>('SELECT MAX(version) AS version FROM rumble_migrations');
    return Number(row?.version ?? 0);
  }
}
