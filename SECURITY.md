# StreamShare Security Architecture Blueprint & Threat Model

This document specifies the end-to-end security architecture, cryptographic configurations, and defensive controls implemented within the **StreamShare** Peer-to-Peer (P2P) OTT Subscription Classifieds and Direct Messaging Marketplace.

---

## 1. Cryptographic Standards & Data Protection

### 1.1 In Transit: TLS 1.3 & Secure WebSockets (WSS)
* **Transport Layer Security:** All HTTP traffic is terminated using TLS 1.3 with forward secrecy cipher suites (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
* **HSTS (HTTP Strict Transport Security):** Enforced via `helmet` with `maxAge: 31536000` (1 year), `includeSubDomains: true`, and `preload: true` to prevent SSL stripping attacks.
* **WebSocket Security (WSS):** WebSocket connections upgrade strictly over secure WSS channels. Socket handshakes require valid short-lived JWT credentials passed either through `socket.handshake.auth.token` or secure cookies before connection establishment is allowed.

### 1.2 At Rest: Transparent Data Encryption (TDE) & Central PostgreSQL Storage
* **Database-Level Encryption (TDE):** All relational entities (`users`, `listings`, `conversations`, `messages`, `audit_logs`) reside in PostgreSQL with underlying block/tablespace AES-256 encryption.
* **Central Oversight Architecture:** All peer messages are persisted centrally in PostgreSQL rather than purely transient memory buffers, providing administrators with immutable audit records for fraud detection, harassment moderation, and policy enforcement.

### 1.3 Zero Sensitive Payload Logging Policy
* **Winston Custom Redaction Formatter:** Application logs in `src/config/logger.ts` execute recursive redaction across all log arguments.
* **Redacted Keys:** `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `content`, `message`, `body`, `creditCard`, `cvv`, `pin`.
* **Guaranteed Outcome:** Message bodies and authentication credentials never appear in application stdout, console, file logs, or distributed observability pipelines (Datadog, CloudWatch, etc.).

---

## 2. Authentication & Session Management

### 2.1 Dual-Token JWT Architecture
* **Access Tokens:** Short-lived (15 minutes), signed with HMAC-SHA256 (`HS256`), containing minimal non-sensitive identity metadata (`userId`, `email`, `username`, `role`).
* **Refresh Tokens:** Long-lived (7 days), stored in database as cryptographic SHA-256 hashes (`tokenHash`). Delivered to the browser exclusively inside `HttpOnly`, `SameSite=lax` (or `strict`), `Secure` cookies inaccessible to JavaScript.

### 2.2 Token Rotation & Replay Attack Defense
* Every call to `/api/auth/refresh` invalidates the submitted refresh token (`revoked: true`) and issues a fresh pair (Token Rotation).
* **Reuse Detection:** If an already-revoked refresh token is presented (indicating stolen session tokens), the authentication engine automatically revokes **all** active refresh tokens for that user ID, invalidating all sessions across all devices immediately.

### 2.3 Password Hashing
* User passwords are encrypted using `bcryptjs` with an adaptive work factor of **12 salt rounds**, protecting against rainbow tables and offline GPU cracking.

---

## 3. Injection Defenses & Input Sanitization

### 3.1 SQL Injection Prevention
* Database communication is managed via **Prisma ORM**, which enforces parameterized, strongly typed queries for all reads and writes. Raw, unparameterized SQL strings are completely avoided.

### 3.2 Cross-Site Scripting (XSS) Sanitization
* All user-submitted text fields (classified listing descriptions, terms, and direct chat messages) are sanitized using `sanitize-html` before reaching application logic or the database.
* All HTML tags (`<script>`, `<iframe>`, `<img>`, `<svg>`, etc.), inline event handlers (`onload`, `onerror`), and `javascript:` pseudoprotocols are unconditionally discarded.

### 3.3 Strict Payload Schema Validation
* Request payloads are parsed and validated using **Zod** schemas in `src/middlewares/validator.ts`. Any payload containing unexpected types or malformed fields is rejected with `400 Bad Request`.
* JSON and URL-encoded body parsers are restricted to a **10 KB limit** to neutralize payload-stuffing and memory exhaustion attacks.

### 3.4 Content Security Policy (CSP) & HTTP Defense Headers
Configured via `helmet`:
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000 ws: wss:; frame-ancestors 'none'; object-src 'none';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 4. Rate Limiting & Abuse Prevention

### 4.1 Layered Rate Limiters (`express-rate-limit`)
1. **Global API Limiter:** Max 100 requests per 15-minute window per IP.
2. **Authentication Limiter:** Max 10 attempts per 15-minute window on `/api/auth/login`, `/api/auth/register`, and `/api/auth/refresh` to defeat brute-force dictionary attacks.
3. **Chat Dispatch Limiter:** Max 60 messages per minute per authenticated user/IP to prevent chat flooding.

### 4.2 WebSocket Anti-Flooding Controls
* The WebSocket event handler maintains an in-memory sliding window tracking timestamp intervals.
* Sockets exceeding 5 messages in 5 seconds are immediately choked, and the client receives a rate limit warning event.

### 4.3 Automated Safety Scanning
Incoming messages are passed through regex-based heuristic analyzers in `src/utils/sanitizer.ts`:
* Detects solicitation of master account credentials or 2FA/PIN codes.
* Detects credit card / debit card numerical sequences.
* Detects unauthorized off-platform URL redirections.
* Flags violations automatically with `isFlagged: true` and notifies administrators in real time via the `admin:moderation` WebSocket channel.

---

## 5. Administrative Route Protection & Surveillance

### 5.1 Route Guarding & RBAC
* Administrative endpoints under `/api/admin/*` and the frontend route `/admin/chats` require:
  1. Valid, non-expired JWT authentication.
  2. Verified `Role.ADMIN` claims verified against current PostgreSQL state.
  3. Non-suspended account status (`isBanned: false`).

### 5.2 Strict IP Allowlisting (`requireAdminIp`)
* In `src/middlewares/ipFilter.ts`, the client IP address (extracted via `req.ip` or verified proxy headers) is evaluated against `ADMIN_ALLOWED_IPS`.
* Requests originating outside designated operator CIDRs receive `403 Forbidden` and trigger a security alert.

### 5.3 Immutable Audit Logging (`AuditLog`)
* Administrative oversight operations (viewing conversation transcripts, flagging messages, banning users, suspending listings) are automatically committed to the `AuditLog` table with:
  * `adminId`
  * `action`
  * `targetType` & `targetId`
  * `ipAddress`
  * `userAgent`
  * `timestamp`

---

## 6. High-Performance Redis Caching & Resilience Architecture

### 6.1 Cache Topology & Invalidation Strategy
* **Classifieds Feed Cache:** Results of filtered marketplace searches (`listings:cat=...:sort=...:page=...`) are cached in Redis with a 60-second TTL.
* **Proactive Cache Invalidation:** When a listing is created, updated, marked as SOLD, or suspended, pattern-based cache clearing (`listings:*`) is triggered using Redis `SCAN` (preventing CPU blocking caused by `KEYS`).
* **Listing Detail Cache:** Frequently retrieved single listings are cached for 300 seconds (`listing:<id>`) and invalidated immediately upon edits.
* **Admin Dashboard KPIs:** Aggregated system statistics are cached for 45 seconds (`admin:dashboard:stats`) to avoid continuous table scans across 5 relational tables.

### 6.2 Real-Time Online Presence
* Connected WebSockets register user presence in Redis (`user:<userId>:online`) with a 120-second sliding heartbeat TTL.
* Disconnect events proactively remove the presence key.

### 6.3 Self-Healing Failover
* The cache layer (`src/config/redis.ts`) includes an automatic **in-memory fallback**. If the Redis Stack container is temporarily unreachable or restarting, user requests gracefully fall back to in-memory TTL caching without throwing unhandled exceptions or failing API calls.
