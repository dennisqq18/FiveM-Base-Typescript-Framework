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

export interface RumblePlayer {
  id: number;
  playerId: number;
  source: number;
  identifier: string;
  name: string;
  character: RumbleCharacter;
}

export interface RumbleCoreApi {
  GetApiVersion(): string;
  GetPlayer(source: number): RumblePlayer | null;
  GetPlayerById(playerId: number): RumblePlayer | null;
  GetMoney(source: number, account: MoneyAccount): number | null;
  AddMoney(source: number, account: MoneyAccount, amount: number, reason?: string): Promise<boolean>;
  RemoveMoney(source: number, account: MoneyAccount, amount: number, reason?: string): Promise<boolean>;
  GetDiagnostics(): Record<string, any>;
  PublishEvent(name: string, payload?: any): boolean;
}
