declare function on(eventName: string, handler: (...args: any[]) => void): void;
declare function onNet(eventName: string, handler: (...args: any[]) => void): void;
declare function emit(eventName: string, ...args: any[]): void;
declare function emitNet(eventName: string, target: number | string, ...args: any[]): void;
declare function RegisterCommand(
  commandName: string,
  handler: (source: number, args: string[], rawCommand: string) => void,
  restricted: boolean
): void;
declare function GetCurrentResourceName(): string;
declare function GetNumPlayerIdentifiers(source: number | string): number;
declare function GetPlayerIdentifier(source: number | string, index: number): string | null;
declare function GetPlayerName(source: number | string): string | null;
declare function getPlayers(): string[];
declare function GetPlayerPed(source: number | string): number;
declare function GetEntityCoords(entity: number): [number, number, number];
declare function IsPlayerAceAllowed(source: number | string, object: string): boolean;
declare function GetConvar(name: string, defaultValue: string): string;
declare function GetConvarInt(name: string, defaultValue: number): number;
declare function exports(exportName: string, handler: (...args: any[]) => any): void;
declare function GetResourceState(resourceName: string): string;
declare function GetEntityHeading(entity: number): number;
declare function GetEntityHealth(entity: number): number;
declare function GetPedArmour(ped: number): number;

declare const performance: { now(): number };
