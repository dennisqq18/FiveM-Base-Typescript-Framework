class LogRepository {
  async insert(data: {
    category: string;
    action: string;
    sourceIdentifier: string | null;
    sourceCharacterId: number | null;
    targetIdentifier: string | null;
    targetCharacterId: number | null;
    payload: string;
    requestId?: string | null;
  }): Promise<void> {
    await dbInsert(
      `INSERT INTO rumble_logs
        (category, action, source_identifier, source_character_id, target_identifier, target_character_id, payload, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category.slice(0, 48),
        data.action.slice(0, 64),
        data.sourceIdentifier,
        data.sourceCharacterId,
        data.targetIdentifier,
        data.targetCharacterId,
        data.payload.slice(0, 16000),
        data.requestId ? data.requestId.slice(0, 96) : null,
      ],
    );
  }
}
