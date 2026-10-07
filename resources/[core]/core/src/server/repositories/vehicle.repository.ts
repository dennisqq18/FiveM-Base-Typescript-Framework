class VehicleRepository {
  async list(characterId: number): Promise<any[]> {
    return await dbQuery<any[]>('SELECT * FROM rumble_owned_vehicles WHERE character_id = ? ORDER BY id ASC', [characterId]);
  }

  async getById(id: number): Promise<any | null> {
    return await dbSingle<any>('SELECT * FROM rumble_owned_vehicles WHERE id = ? LIMIT 1', [id]);
  }

  async findByPlate(plate: string, characterId?: number): Promise<any | null> {
    if (characterId === undefined) return await dbSingle<any>('SELECT * FROM rumble_owned_vehicles WHERE plate = ? LIMIT 1', [plate]);
    return await dbSingle<any>('SELECT * FROM rumble_owned_vehicles WHERE plate = ? AND character_id = ? LIMIT 1', [plate, characterId]);
  }

  async insert(characterId: number, plate: string, model: string, properties: string): Promise<number> {
    return await dbInsert(
      `INSERT INTO rumble_owned_vehicles
        (character_id, plate, model, garage, stored, fuel, engine_health, body_health, properties)
       VALUES (?, ?, ?, 'legion', 1, 100, 1000, 1000, ?)`,
      [characterId, plate, model, properties],
    );
  }

  async update(characterId: number, id: number, data: any): Promise<void> {
    await dbUpdate(
      `UPDATE rumble_owned_vehicles
       SET garage = ?, stored = ?, fuel = ?, engine_health = ?, body_health = ?, properties = ?
       WHERE id = ? AND character_id = ?`,
      [data.garage, data.stored ? 1 : 0, data.fuel, data.engineHealth, data.bodyHealth, data.properties, id, characterId],
    );
  }

  async remove(characterId: number, plate: string): Promise<number> {
    return await dbUpdate('DELETE FROM rumble_owned_vehicles WHERE plate = ? AND character_id = ?', [plate, characterId]);
  }
}
