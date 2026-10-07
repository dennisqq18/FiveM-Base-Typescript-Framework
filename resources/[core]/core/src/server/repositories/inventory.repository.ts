class InventoryRepository {
  async list(characterId: number): Promise<any[]> {
    return await dbQuery<any[]>(
      'SELECT id, slot, item_name, amount, metadata FROM rumble_inventory WHERE character_id = ? ORDER BY slot ASC',
      [characterId],
    );
  }

  async hasAny(characterId: number): Promise<boolean> {
    return Boolean(await dbSingle<any>('SELECT id FROM rumble_inventory WHERE character_id = ? LIMIT 1', [characterId]));
  }

  async insert(characterId: number, slot: number, itemName: string, amount: number, metadata: string): Promise<number> {
    return await dbInsert(
      'INSERT INTO rumble_inventory (character_id, slot, item_name, amount, metadata) VALUES (?, ?, ?, ?, ?)',
      [characterId, slot, itemName, amount, metadata],
    );
  }

  async insertMany(characterId: number, items: Array<{ slot: number; itemName: string; amount: number; metadata: string }>): Promise<void> {
    if (items.length === 0) return;
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = items.flatMap((item) => [characterId, item.slot, item.itemName, item.amount, item.metadata]);
    await dbQuery(
      `INSERT INTO rumble_inventory (character_id, slot, item_name, amount, metadata) VALUES ${placeholders}`,
      params,
    );
  }

  async updateAmount(characterId: number, id: number, amount: number): Promise<void> {
    await dbUpdate('UPDATE rumble_inventory SET amount = ? WHERE id = ? AND character_id = ?', [amount, id, characterId]);
  }

  async remove(characterId: number, id: number): Promise<void> {
    await dbUpdate('DELETE FROM rumble_inventory WHERE id = ? AND character_id = ?', [id, characterId]);
  }
}
