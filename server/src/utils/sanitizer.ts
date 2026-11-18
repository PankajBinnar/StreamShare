import sanitizeHtml from 'sanitize-html';

/**
 * Strict XSS sanitizer for user-provided text inputs
 * Strips all HTML tags, script elements, javascript: protocols, and event handlers
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return sanitizeHtml(input.trim(), {
    allowedTags: [], // Strip ALL HTML tags
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}

/**
 * Recursive sanitizer for nested request objects
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeText(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
}

/**
 * Automated safety scanner for P2P OTT marketplace chat
 * Detects policy violations like requesting master passwords, payment outside platform, or credit cards
 */
export interface SafetyCheckResult {
  isFlagged: boolean;
  reason?: string;
}

export function scanMessageSafety(content: string): SafetyCheckResult {
  const lower = content.toLowerCase();

  // Pattern 1: Asking for master account credentials
  const credentialPatterns = [
    /master\s*(pass|password|creds|credential)/i,
    /primary\s*(pass|password|creds)/i,
    /send\s*(your\s*)?(password|pin|2fa|otp)/i,
    /change\s*the\s*email/i,
  ];

  for (const pattern of credentialPatterns) {
    if (pattern.test(lower)) {
      return {
        isFlagged: true,
        reason: 'Automated Rule: Soliciting master account credentials or 2FA codes violates P2P safety policy',
      };
    }
  }

  // Pattern 2: Financial data / Credit Card patterns
  const creditCardPattern = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
  if (creditCardPattern.test(content)) {
    return {
      isFlagged: true,
      reason: 'Automated Rule: Suspected credit card or financial data sharing detected',
    };
  }

  // Pattern 3: Suspicious external redirect links / phishing
  const phishingPatterns = [
    /bit\.ly\//i,
    /tinyurl\.com\//i,
    /discord\.gg\//i,
    /t\.me\//i,
    /telegram\.me\//i,
  ];

  for (const pattern of phishingPatterns) {
    if (pattern.test(lower)) {
      return {
        isFlagged: true,
        reason: 'Automated Rule: External redirection or off-platform communication link detected',
      };
    }
  }

  return { isFlagged: false };
}

