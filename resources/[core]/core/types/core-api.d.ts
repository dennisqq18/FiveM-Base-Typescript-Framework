declare namespace RumbleAPI {
  type MoneyAccount = 'cash' | 'card';
  type NeedType = 'hunger' | 'thirst';
  type DeathState = 'alive' | 'downed' | 'dead' | 'respawning';

  interface Position {
    x: number;
    y: number;
    z: number;
    heading: number;
  }

  interface Character {
    id: number;
    stateId: number;
    citizenId: string;
    slot: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    cash: number;
    card: number;
    position: Position;
    health: number;
    armor: number;
    hunger: number;
    thirst: number;
  }

  interface PlayerData {
    id: number;
    playerId: number;
    source: number;
    identifier: string;
    name: string;
    character: Character;
  }

  interface CallbackMap {
    'rumble:getPlayer': { request: null; response: PlayerData | null };
    'rumble:getInventory': { request: null; response: any };
    'rumble:getMetadata': { request: null; response: Record<string, any> | null };
    'rumble:getVehicles': { request: null; response: any[] };
    'rumble:getConfig': { request: null; response: Record<string, any> };
  }

  type CallbackName = keyof CallbackMap;
  type CallbackRequest<K extends CallbackName> = CallbackMap[K]['request'];
  type CallbackResponse<K extends CallbackName> = CallbackMap[K]['response'];
}
