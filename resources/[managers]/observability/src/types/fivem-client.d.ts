declare function GetCurrentResourceName(): string;
declare function SendNuiMessage(message: string): void;
declare function SetNuiFocus(hasFocus: boolean, hasCursor: boolean): void;
declare function RegisterNuiCallbackType(name: string): void;
declare function emitNet(eventName: string, ...args: any[]): void;
declare function on(eventName: string, handler: (...args: any[]) => void): void;
declare function onNet(eventName: string, handler: (...args: any[]) => void): void;
declare function TriggerEvent(eventName: string, ...args: any[]): void;
