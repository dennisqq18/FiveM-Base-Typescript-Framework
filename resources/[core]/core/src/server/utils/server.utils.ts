class CoreError extends Error {
  readonly code: string;
  readonly data: Record<string, any>;

  constructor(code: string, message: string, data: Record<string, any> = {}) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    this.data = data;
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance3D(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function formatMoney(value: number): string {
  return Math.floor(value).toLocaleString('en-US');
}

function safeJsonParse(value: any, fallback: any = {}): any {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function serializedSize(value: any): number {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function getPlayerIdentifiers(source: number): string[] {
  const identifiers: string[] = [];
  const count = GetNumPlayerIdentifiers(source);
  for (let index = 0; index < count; index++) {
    const identifier = GetPlayerIdentifier(source, index);
    if (identifier) identifiers.push(identifier);
  }
  return identifiers;
}

function getPrimaryIdentifier(source: number): string | null {
  const identifiers = getPlayerIdentifiers(source);
  return identifiers.find((id) => id.startsWith('license:')) ?? identifiers.find((id) => id.startsWith('fivem:')) ?? identifiers[0] ?? null;
}

function normalizeDateOfBirth(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return validateDateOfBirth(match[1]) ? match[1] : null;
}

function validateCharacterName(value: string): boolean {
  return /^[\p{L}'-]{2,24}$/u.test(value);
}

function validateDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const year = parsed.getUTCFullYear();
  if (year < 1900) return false;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return parsed.getTime() <= today;
}

function isAtLeastAge(value: string, minimumAge: number): boolean {
  if (!validateDateOfBirth(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age--;
  return age >= minimumAge;
}

function validPlayerSource(value: any): value is number {
  const source = Number(value);
  return Number.isInteger(source) && source > 0 && Boolean(GetPlayerName(source));
}

function sanitizeReason(value: any, fallback = 'unknown'): string {
  const text = String(value ?? fallback).trim();
  return (text || fallback).slice(0, 128);
}
