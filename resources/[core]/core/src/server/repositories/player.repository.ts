class PlayerRepository {
  async upsert(identifier: string, playerName: string): Promise<number> {
    return await dbInsert(
      `INSERT INTO rumble_players (identifier, player_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         player_name = VALUES(player_name),
         last_seen = CURRENT_TIMESTAMP,
         player_id = LAST_INSERT_ID(player_id)`,
      [identifier, playerName],
    );
  }

  async getActiveCharacterId(identifier: string): Promise<number> {
    const row = await dbSingle<any>('SELECT active_character_id FROM rumble_players WHERE identifier = ? LIMIT 1', [identifier]);
    return Number(row?.active_character_id ?? 0);
  }

  async setActiveCharacter(identifier: string, characterId: number): Promise<void> {
    await dbUpdate(
      'UPDATE rumble_players SET active_character_id = ?, last_seen = CURRENT_TIMESTAMP WHERE identifier = ?',
      [characterId, identifier],
    );
  }
}
