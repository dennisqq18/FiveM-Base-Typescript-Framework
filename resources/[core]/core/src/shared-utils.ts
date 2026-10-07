namespace RumbleShared {
  export function clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
  }

  export function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  export function formatNumber(value: number): string {
    return Math.floor(value).toLocaleString('en-US');
  }

  export function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  export function vector3(x: number, y: number, z: number): { x: number; y: number; z: number } {
    return { x: Number(x), y: Number(y), z: Number(z) };
  }

  export function vector4(x: number, y: number, z: number, heading: number): Position {
    return { x: Number(x), y: Number(y), z: Number(z), heading: Number(heading) };
  }
}
