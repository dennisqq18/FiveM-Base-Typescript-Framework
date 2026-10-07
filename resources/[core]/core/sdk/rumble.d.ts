export type MoneyAccount = 'cash' | 'card';
export type RumbleHealth = 'healthy' | 'degraded';

export interface RumbleCharacter {
  id: number;
  stateId: number;
  citizenId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  cash: number;
  card: number;
}

export interface RumbleFaction {
  name: string;
  label: string;
  grade: number;
  gradeName: string;
  gradeLabel: string;
}

export interface RumblePlayer {
  id: number;
  playerId: number;
  source: number;
  identifier: string;
  name: string;
  character: RumbleCharacter;
  faction: RumbleFaction | null;
}

export interface RumbleCoreApi {
  GetApiVersion(): string;
  GetPlayer(source: number): RumblePlayer | null;
  GetPlayerById(playerId: number): RumblePlayer | null;
  GetMoney(source: number, account: MoneyAccount): number | null;
  AddMoney(source: number, account: MoneyAccount, amount: number, reason?: string): Promise<boolean>;
  RemoveMoney(source: number, account: MoneyAccount, amount: number, reason?: string): Promise<boolean>;
  GetFaction(source: number): RumbleFaction | null;
  SetFaction(source: number, faction: string | null, grade?: number): Promise<boolean>;
  GetDiagnostics(): Record<string, any>;
  PublishEvent(name: string, payload?: any): boolean;
}
