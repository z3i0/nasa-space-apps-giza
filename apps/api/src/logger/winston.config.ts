import path from 'node:path';
import fs from 'node:fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Redact sensitive properties to prevent leaking secrets in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
]);

const sanitize = winston.format((info) => {
  const mask = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mask);
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = mask(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  };
  return mask(info);
});

// Formatting for file output (structured JSON)
const fileFormat = winston.format.combine(
  sanitize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Formatting for console output (clean and human-readable)
const consoleFormat = winston.format.combine(
  sanitize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}] ` : '';
    const metaStr =
      Object.keys(meta).length > 0
        ? ` ${JSON.stringify(meta)}`
        : '';
    return `${timestamp} [${String(level).toUpperCase()}] ${ctx}${message}${metaStr}`;
  }),
);

export const createWinstonLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      // 1. Console transport
      new winston.transports.Console({
        format: consoleFormat,
      }),

      // 2. Rotating error log (errors & warnings)
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
        format: fileFormat,
      }),

      // 3. Rotating combined log (all logs)
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
        format: fileFormat,
      }),
    ],
    exceptionHandlers: [
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
        format: fileFormat,
      }),
    ],
  });
};
