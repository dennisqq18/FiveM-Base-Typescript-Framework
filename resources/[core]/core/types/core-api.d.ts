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

  interface FactionMembership {
    name: string;
    label: string;
    grade: number;
    gradeName: string;
    gradeLabel: string;
  }

  interface PlayerData {
    id: number;
    playerId: number;
    source: number;
    identifier: string;
    name: string;
    character: Character;
    faction: FactionMembership | null;
  }

  interface CallbackMap {
    'rumble:getPlayer': { request: null; response: PlayerData | null };
    'rumble:getInventory': { request: null; response: any };
    'rumble:getMetadata': { request: null; response: Record<string, any> | null };
    'rumble:getFaction': { request: null; response: FactionMembership | null };
    'rumble:getVehicles': { request: null; response: any[] };
    'rumble:getConfig': { request: null; response: Record<string, any> };
  }

  type CallbackName = keyof CallbackMap;
  type CallbackRequest<K extends CallbackName> = CallbackMap[K]['request'];
  type CallbackResponse<K extends CallbackName> = CallbackMap[K]['response'];
}

export interface RumbleRuntimeApi {
  GetApiVersion(): string;
  GetDiagnostics(): Record<string, any>;
  GetCapabilities(): Record<string, any>;
  PublishEvent(name: string, payload?: any): boolean;
}
