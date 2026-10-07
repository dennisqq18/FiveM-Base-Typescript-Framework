type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
type LogCategory = 'CORE' | 'DATABASE' | 'MIGRATION' | 'SECURITY' | 'ADMIN' | 'PLAYER' | 'CHARACTER' | 'MONEY' | 'INVENTORY' | 'VEHICLE' | 'RPC' | 'HEALTH';

class StructuredLogger {
  private write(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    const suffix = data === undefined ? '' : ` ${this.serialize(data)}`;
    const line = `[RUMBLE][${level}][${category}] ${message}${suffix}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN' || level === 'SECURITY') console.warn(line);
    else console.log(line);
  }

  private serialize(data: any): string {
    try {
      const text = JSON.stringify(data);
      return text.length > 2000 ? `${text.slice(0, 2000)}...` : text;
    } catch {
      return String(data);
    }
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.write('INFO', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.write('WARN', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any): void {
    this.write('ERROR', category, message, data);
  }

  security(message: string, data?: any): void {
    this.write('SECURITY', 'SECURITY', message, data);
  }
}

const Logger = new StructuredLogger();
