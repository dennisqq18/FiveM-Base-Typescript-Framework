class PlayerRepository {
  async upsert(identifier: string, playerName: string): Promise<void> {
    await dbQuery(
      `INSERT INTO rumble_players (identifier, player_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE player_name = VALUES(player_name), last_seen = CURRENT_TIMESTAMP`,
      [identifier, playerName],
    );
  }

  async get(identifier: string): Promise<any | null> {
    return await dbSingle<any>('SELECT * FROM rumble_players WHERE identifier = ? LIMIT 1', [identifier]);
  }

  async setActiveCharacter(identifier: string, characterId: number): Promise<void> {
    await dbUpdate(
      'UPDATE rumble_players SET active_character_id = ?, last_seen = CURRENT_TIMESTAMP WHERE identifier = ?',
      [characterId, identifier],
    );
  }
}
