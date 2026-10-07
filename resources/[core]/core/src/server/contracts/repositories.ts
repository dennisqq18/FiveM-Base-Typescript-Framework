interface PlayerRepositoryContract {
  upsert(identifier: string, playerName: string): Promise<number>;
  getActiveCharacterId(identifier: string): Promise<number | null>;
  setActiveCharacter(identifier: string, characterId: number): Promise<void>;
}

interface CharacterRepositoryContract {
  list(identifier: string): Promise<any[]>;
  getById(identifier: string, characterId: number): Promise<any | null>;
  saveState(characterId: number, identifier: string, version: number, data: any): Promise<boolean>;
}

interface MetadataRepositoryContract {
  list(characterId: number): Promise<any[]>;
  set(characterId: number, key: string, value: string): Promise<void>;
  remove(characterId: number, key: string): Promise<void>;
}
