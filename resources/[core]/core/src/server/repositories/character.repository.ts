class CharacterRepository {
  async list(identifier: string): Promise<any[]> {
    return await dbQuery<any[]>(
      `SELECT * FROM rumble_characters
       WHERE player_identifier = ? AND deleted_at IS NULL
       ORDER BY last_played DESC, slot ASC`,
      [identifier],
    );
  }

  async getById(identifier: string, characterId: number): Promise<any | null> {
    return await dbSingle<any>(
      `SELECT * FROM rumble_characters
       WHERE id = ? AND player_identifier = ? AND deleted_at IS NULL LIMIT 1`,
      [characterId, identifier],
    );
  }

  async getByIdOnly(characterId: number): Promise<any | null> {
    return await dbSingle<any>('SELECT * FROM rumble_characters WHERE id = ? LIMIT 1', [characterId]);
  }

  async insert(data: {
    identifier: string;
    citizenId: string;
    slot: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    cash: number;
    card: number;
    position: { x: number; y: number; z: number; heading: number };
  }): Promise<number> {
    return await dbInsert(
      `INSERT INTO rumble_characters
        (player_identifier, citizen_id, slot, first_name, last_name, date_of_birth, cash, card,
         position_x, position_y, position_z, position_heading)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.identifier,
        data.citizenId,
        data.slot,
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.cash,
        data.card,
        data.position.x,
        data.position.y,
        data.position.z,
        data.position.heading,
      ],
    );
  }

  async saveState(characterId: number, identifier: string, data: any): Promise<void> {
    await dbUpdate(
      `UPDATE rumble_characters
       SET position_x = ?, position_y = ?, position_z = ?, position_heading = ?,
           health = ?, armor = ?, hunger = ?, thirst = ?, last_played = CURRENT_TIMESTAMP
       WHERE id = ? AND player_identifier = ?`,
      [
        data.position.x,
        data.position.y,
        data.position.z,
        data.position.heading,
        data.health,
        data.armor,
        data.hunger,
        data.thirst,
        characterId,
        identifier,
      ],
    );
  }

  async updateIdentity(identifier: string, characterId: number, firstName: string, lastName: string, dateOfBirth: string): Promise<void> {
    await dbUpdate(
      `UPDATE rumble_characters
       SET first_name = ?, last_name = ?, date_of_birth = ?
       WHERE id = ? AND player_identifier = ? AND deleted_at IS NULL`,
      [firstName, lastName, dateOfBirth, characterId, identifier],
    );
  }

  async touch(characterId: number, identifier: string): Promise<void> {
    await dbUpdate(
      'UPDATE rumble_characters SET last_played = CURRENT_TIMESTAMP WHERE id = ? AND player_identifier = ?',
      [characterId, identifier],
    );
  }

  async updateMoney(characterId: number, identifier: string, account: 'cash' | 'card', amount: number): Promise<void> {
    const column = account === 'cash' ? 'cash' : 'card';
    await dbUpdate(`UPDATE rumble_characters SET ${column} = ? WHERE id = ? AND player_identifier = ?`, [amount, characterId, identifier]);
  }
}
