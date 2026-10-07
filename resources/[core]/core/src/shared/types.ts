namespace RumbleShared {
  export type MoneyAccount = 'cash' | 'card';
  export type NeedType = 'hunger' | 'thirst';
  export type DeathState = 'alive' | 'downed' | 'dead' | 'respawning';

  export interface Position {
    x: number;
    y: number;
    z: number;
    heading: number;
  }

  export interface Character {
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

  export interface FactionMembership {
    name: string;
    label: string;
    grade: number;
    gradeName: string;
    gradeLabel: string;
  }

  export interface PlayerData {
    id: number;
    playerId: number;
    source: number;
    identifier: string;
    name: string;
    character: Character;
    faction: FactionMembership | null;
  }

  export interface InventorySlot {
    id: number;
    slot: number;
    name: string;
    amount: number;
    metadata: Record<string, any>;
  }

  export interface ItemDefinition {
    name: string;
    label: string;
    weight: number;
    stackable: boolean;
    usable: boolean;
  }

  export interface OwnedVehicle {
    id: number;
    characterId: number;
    plate: string;
    model: string;
    garage: string;
    stored: boolean;
    fuel: number;
    engineHealth: number;
    bodyHealth: number;
    properties: Record<string, any>;
  }
}

interface RumbleCallbackMap {
  'rumble:getPlayer': { request: null; response: RumbleShared.PlayerData | null };
  'rumble:getInventory': { request: null; response: { items: RumbleShared.InventorySlot[]; weight: number; maxWeight: number; maxSlots: number } | null };
  'rumble:getMetadata': { request: null; response: Record<string, any> | null };
  'rumble:getFaction': { request: null; response: RumbleShared.FactionMembership | null };
  'rumble:getVehicles': { request: null; response: RumbleShared.OwnedVehicle[] };
  'rumble:getConfig': { request: null; response: { maxCharacters: number; inventoryMaxWeight: number; inventoryMaxSlots: number; itemDefinitions: Record<string, RumbleShared.ItemDefinition> } };
}

type RumbleCallbackName = keyof RumbleCallbackMap;
type RumbleCallbackRequest<K extends RumbleCallbackName> = RumbleCallbackMap[K]['request'];
type RumbleCallbackResponse<K extends RumbleCallbackName> = RumbleCallbackMap[K]['response'];
