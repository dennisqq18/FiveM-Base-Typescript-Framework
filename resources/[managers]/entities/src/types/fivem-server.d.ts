declare function GetCurrentResourceName(): string;
declare function GetResourceState(resourceName: string): string;
declare function DoesEntityExist(entity: number): boolean;
declare function GetEntityType(entity: number): number;
declare function NetworkGetEntityOwner(entity: number): number;
declare function DeleteEntity(entity: number): void;
declare function on(eventName: string, handler: (...args: any[]) => void): void;
declare function exports(name: string, handler: (...args: any[]) => any): void;
