interface FactionMembershipRow {
  faction_name: string;
  faction_label: string;
  grade: number;
  grade_name: string;
  grade_label: string;
}

class FactionRepository {
  async getMembership(characterId: number): Promise<FactionMembershipRow | null> {
    return await dbSingle<FactionMembershipRow>(
      `SELECT cf.faction_name,
              f.label AS faction_label,
              cf.grade,
              fg.name AS grade_name,
              fg.label AS grade_label
       FROM rumble_character_factions cf
       JOIN rumble_factions f ON f.name = cf.faction_name
       JOIN rumble_faction_grades fg ON fg.faction_name = cf.faction_name AND fg.grade = cf.grade
       WHERE cf.character_id = ?
       LIMIT 1`,
      [characterId],
    );
  }

  async factionExists(factionName: string): Promise<boolean> {
    return Boolean(await dbSingle<any>('SELECT name FROM rumble_factions WHERE name = ? LIMIT 1', [factionName]));
  }

  async gradeExists(factionName: string, grade: number): Promise<boolean> {
    return Boolean(await dbSingle<any>(
      'SELECT grade FROM rumble_faction_grades WHERE faction_name = ? AND grade = ? LIMIT 1',
      [factionName, grade],
    ));
  }

  async setMembership(characterId: number, factionName: string, grade: number): Promise<void> {
    await dbQuery(
      `INSERT INTO rumble_character_factions (character_id, faction_name, grade)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE faction_name = VALUES(faction_name), grade = VALUES(grade), updated_at = CURRENT_TIMESTAMP`,
      [characterId, factionName, grade],
    );
  }

  async removeMembership(characterId: number): Promise<void> {
    await dbUpdate('DELETE FROM rumble_character_factions WHERE character_id = ?', [characterId]);
  }
}
