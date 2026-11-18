import winston from 'winston';
import { env } from './environment.js';

// Sensitive keys that must be scrubbed from logs
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'content',       // Never log message bodies
  'message',       // Redact message payloads
  'body',          // Redact raw chat bodies
  'secret',
  'creditcard',
  'cvv',
  'pin',
]);

/**
 * Recursively deep-redacts sensitive fields from objects before logging
 */
function redactObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      redacted[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object') {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const redactFormat = winston.format((info) => {
  // Redact top level message if string looks like it contains sensitive info
  const sanitized = redactObject(info);
  return sanitized;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'streamshare-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level}] [${service}]: ${message}${metaString}`;
        })
      ),
    }),
  ],
});

