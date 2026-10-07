class LogRepository {
  async insert(data: {
    category: string;
    action: string;
    sourceIdentifier: string | null;
    sourceCharacterId: number | null;
    targetIdentifier: string | null;
    targetCharacterId: number | null;
    payload: string;
  }): Promise<void> {
    await dbInsert(
      `INSERT INTO rumble_logs
        (category, action, source_identifier, source_character_id, target_identifier, target_character_id, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category.slice(0, 48),
        data.action.slice(0, 64),
        data.sourceIdentifier,
        data.sourceCharacterId,
        data.targetIdentifier,
        data.targetCharacterId,
        data.payload.slice(0, 16000),
      ],
    );
  }
}
