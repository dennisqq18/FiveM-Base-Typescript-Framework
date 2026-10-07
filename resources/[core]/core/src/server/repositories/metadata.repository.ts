class MetadataRepository {
  async list(characterId: number): Promise<any[]> {
    return await dbQuery<any[]>(
      'SELECT meta_key, meta_value FROM rumble_character_metadata WHERE character_id = ?',
      [characterId],
    );
  }

  async set(characterId: number, key: string, serializedValue: string): Promise<void> {
    await dbQuery(
      `INSERT INTO rumble_character_metadata (character_id, meta_key, meta_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), updated_at = CURRENT_TIMESTAMP`,
      [characterId, key, serializedValue],
    );
  }

  async remove(characterId: number, key: string): Promise<void> {
    await dbUpdate('DELETE FROM rumble_character_metadata WHERE character_id = ? AND meta_key = ?', [characterId, key]);
  }
}
