# StreamShare 🎬🔒
### Production-Ready Peer-to-Peer (P2P) OTT Subscription Classifieds & Encrypted Real-Time Messaging Marketplace

StreamShare is a production-grade, highly secure peer-to-peer web application designed for users to safely list, browse, negotiate, and share official family-plan profile slots for major OTT streaming platforms (Netflix, Disney+, Amazon Prime Video, Spotify, HBO Max, YouTube Premium, Apple One). 

The platform pairs real-time, peer-to-peer messaging via WebSockets (Socket.io) with centralized PostgreSQL database persistence, giving administrators complete audit oversight while protecting users with military-grade defenses against injection, session hijacking, credential harvesting, and bot flooding.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Next.js 14 Frontend Client      |
                      |   (Tailwind CSS, React, Lucide Icons) |
                      +---------------------------------------+
                                  |                 |
                   HTTPS / TLS 1.3|                 | WSS:// Secure
                   REST API Calls |                 | WebSocket Handshake
                                  v                 v
                      +---------------------------------------+
                      |         Node.js / Express API         |
                      |  - Helmet Security (CSP, HSTS)        |
                      |  - Dual Rate Limiters (Auth, API)     |
                      |  - Dual-Token JWT (Short + HttpOnly)  |
                      |  - XSS Sanitizer & Auto Safety Rules  |
                      |  - Redacted Winston Logging (Zero PII)|
                      |  - Admin IP & RBAC Guard              |
                      +---------------------------------------+
                                  |                 |
                       Parameterized Queries        | Real-Time Event
                       via Prisma ORM               | Room Dispatch
                                  v                 v
                      +---------------------------------------+
                      |      PostgreSQL Database (TDE)        |
                      |  - Users (Bcrypt Cost 12)             |
                      |  - Listings (OTT Categories & Slots)  |
                      |  - Conversations & Messages (Audit)   |
                      |  - RefreshTokens (SHA-256 Hashed)     |
                      |  - Immutable AuditLogs                |
                      +---------------------------------------+
```

---

## Key Features

### 1. Robust User Authentication & Session Security
- **Dual-Token System:** 15-minute access tokens in-memory paired with 7-day `HttpOnly`, `SameSite=lax`, `Secure` refresh cookies.
- **Refresh Token Rotation & Reuse Detection:** Automatic revocation of all user sessions if a compromised refresh token replay is detected.
- **Password Protection:** Cryptographically hashed with `bcryptjs` using a cost factor of 12.
- **Role-Based Access Control (RBAC):** Distinct `USER` and `ADMIN` privileges.

### 2. OTT Subscription Classifieds Feed
- **Listing Entity:** ID, Owner ID, Platform Name, Category (`VIDEO`, `MUSIC`, `GAMING`, `PRODUCTIVITY`), Price, Billing Cycle, Slots Available, Description, Terms, and Status (`ACTIVE`, `SOLD`, `SUSPENDED`).
- **Dynamic Marketplace:** Real-time search, category filtering, platform pills (Netflix, Disney+, Prime, Spotify), price filtering, and pagination.
- **Verified Seller Indicators:** Display seller profile history, slot availability, and platform-specific badges.

### 3. Real-Time Peer-to-Peer Direct Messaging
- **WebSocket Protocol (Socket.io):** Real-time buyer-to-seller negotiation channel with zero polling.
- **Central Message Persistence:** Every message is sanitized and persisted directly into PostgreSQL, guaranteeing full administrative auditability.
- **Automated Chat Safety Scanner:** Automatically detects and flags policy violations (e.g. asking for master account passwords, 2FA codes, or credit card numbers).
- **Interactive UI:** Typing indicators, unread message badges, read receipt checkmarks, and manual reporting modal.

### 4. Admin Moderation & Surveillance Center (`/admin/chats`)
- **Strict IP Firewalled Route:** Accessible only to `ADMIN` accounts connecting from whitelisted IP ranges (`ADMIN_ALLOWED_IPS`).
- **Live WebSocket Surveillance:** Subscribes to the `admin:moderation` room to receive instant alerts when automated security rules are tripped.
- **Comprehensive Audit Dashboard:** View all active conversations, message counts, and flagged items.
- **Inspector Drawer & Controls:** Inspect complete message transcripts, dismiss flags, delete messages, ban abusive users, or suspend listings.
- **Compliance Audit Trail:** All administrative actions automatically create an immutable entry in the `AuditLog` table.

### 5. High-Performance Redis Caching & Online Presence
- **Classifieds Feed Caching**: Read-heavy queries (`GET /api/listings`) are cached in Redis with 60-second TTL.
- **Proactive Invalidation**: Key pattern purge (`listings:*`) instantly clears stale feed caches when listings are created, updated, or sold.
- **Admin Dashboard KPI Caching**: Heavy 5-table aggregate counts cached for 45 seconds to reduce DB load.
- **User Presence Tracking**: Real-time WebSocket connection state synced with Redis heartbeat (`user:<id>:online`).
- **Fail-Safe Fallback**: Automatic in-memory fallback if Redis is temporarily unreachable.

---

## Peak-Level Security Matrix

| Requirement | Implementation | Location |
| :--- | :--- | :--- |
| **In-Transit Protection** | TLS 1.3 cipher suites, HSTS preloading, WSS authentication handshake | `server/src/app.ts`, `server/src/sockets/socket.server.ts` |
| **At-Rest Protection** | PostgreSQL tablespace Transparent Data Encryption (TDE), bcrypt cost 12 | `server/prisma/schema.prisma`, `server/src/utils/crypto.ts` |
| **Zero Sensitive Logging** | Recursive Winston redaction scrubbing passwords, tokens, and chat message bodies | `server/src/config/logger.ts` |
| **SQL Injection Defense** | Prisma ORM parameterized queries with strict compile-time types | `server/src/services/*.ts` |
| **XSS Defense** | `sanitize-html` tag stripping on all inputs + Strict Helmet CSP headers | `server/src/utils/sanitizer.ts`, `server/src/app.ts` |
| **Brute Force Protection** | `express-rate-limit` on auth routes (10 attempts / 15 min window) | `server/src/middlewares/rateLimiter.ts` |
| **Spam / Bot Defense** | Sliding-window limiter on Socket.io (max 5 msgs / 5 sec) + API chat limiter | `server/src/sockets/chat.handler.ts` |
| **Admin Route Protection** | IP filtering + RBAC check (`ADMIN_ALLOWED_IPS` & `Role.ADMIN`) | `server/src/middlewares/ipFilter.ts` |

---

## Repository Structure

```
StreamShare/
├── docker-compose.yml              # PostgreSQL 16 Alpine configuration
├── package.json                    # Workspace scripts
├── README.md                       # Comprehensive guide & blueprint
├── SECURITY.md                     # Deep security specification & threat model
│
├── server/                         # Express + TypeScript + Prisma + Socket.io backend
│   ├── .env.example                # Server environment template
│   ├── package.json                # Backend dependencies
│   ├── tsconfig.json               # TypeScript compiler config
│   ├── prisma/
│   │   ├── schema.prisma           # Relational PostgreSQL schema
│   │   └── seed.ts                 # Database seeder (Admin, Users, OTT Listings)
│   └── src/
│       ├── config/
│       │   ├── environment.ts      # Validated environment configuration with Zod
│       │   ├── logger.ts           # Winston logger with PII & payload redaction
│       │   └── prisma.ts           # Prisma client instance
│       ├── controllers/
│       │   ├── admin.controller.ts
│       │   ├── auth.controller.ts
│       │   ├── chat.controller.ts
│       │   └── listing.controller.ts
│       ├── middlewares/
│       │   ├── auth.middleware.ts  # JWT verification & RBAC check
│       │   ├── errorHandler.ts     # Safe error handler (no stack leaks)
│       │   ├── ipFilter.ts         # Admin IP whitelist filter
│       │   ├── rateLimiter.ts      # Layered rate limits (Auth, API, Chat)
│       │   └── validator.ts        # Zod validation & XSS sanitization
│       ├── routes/
│       │   ├── admin.routes.ts     # IP + RBAC protected admin routes
│       │   ├── auth.routes.ts      # Register, login, refresh, logout
│       │   ├── chat.routes.ts      # Conversations & messages
│       │   ├── listing.routes.ts   # Classifieds CRUD & filters
│       │   └── index.ts            # Route aggregation
│       ├── services/
│       │   ├── admin.service.ts
│       │   ├── auth.service.ts
│       │   ├── chat.service.ts
│       │   └── listing.service.ts
│       ├── sockets/
│       │   ├── chat.handler.ts     # Real-time WebSocket event handler & rate limiter
│       │   └── socket.server.ts    # Socket.io JWT handshake authentication
│       ├── utils/
│       │   ├── crypto.ts           # Bcrypt & JWT token utilities
│       │   └── sanitizer.ts        # Input sanitization & heuristic safety scan
│       ├── app.ts                  # Express setup with Helmet & CORS
│       └── server.ts               # HTTP & WebSocket bootstrap
│
└── client/                         # Next.js 14 App Router Frontend
    ├── .env.example                # Client environment template
    ├── package.json                # Frontend dependencies
    ├── next.config.mjs             # Next.js configuration & API proxy
    ├── tailwind.config.ts          # OTT platform accents & dark theme
    └── src/
        ├── app/
        │   ├── layout.tsx          # Root layout with providers & Navbar
        │   ├── page.tsx            # Classifieds marketplace feed & hero
        │   ├── globals.css         # Tailwind & custom scrollbars
        │   ├── admin/chats/page.tsx # Admin moderation panel & audit dashboard
        │   ├── chat/page.tsx       # Real-time chat inbox & message thread
        │   ├── listings/
        │   │   ├── [id]/page.tsx   # Listing details & "Contact Seller"
        │   │   └── new/page.tsx    # Create OTT listing form
        │   ├── login/page.tsx      # Secure login with 1-click test credentials
        │   └── register/page.tsx   # Registration with password complexity check
        ├── components/
        │   ├── AdminChatAuditModal.tsx # Full transcript viewer & moderation actions
        │   ├── CategoryFilter.tsx  # Category pills (Video, Music, Gaming, etc.)
        │   ├── ChatWindow.tsx      # Real-time message thread with report modal
        │   ├── ConversationList.tsx # Left chat sidebar with unread counters
        │   ├── ListingCard.tsx     # OTT listing cards with platform badges
        │   ├── Navbar.tsx          # Responsive navigation & WSS status indicator
        │   └── SecurityBadge.tsx   # End-to-end security architecture banner
        ├── context/
        │   ├── AuthContext.tsx     # React auth context with auto-refresh
        │   └── SocketContext.tsx   # Live Socket.io connection manager
        ├── lib/
        │   ├── api.ts              # API fetch client with auto refresh
        │   └── socket.ts           # Socket singleton
        └── types/
            └── index.ts            # Shared TypeScript interfaces
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Docker & Docker Compose**: For local PostgreSQL database

### 2. Start PostgreSQL via Docker Compose
From the root project directory:
```bash
docker-compose up -d
```
*PostgreSQL runs in Docker with external host port `5433` (mapped to internal `5432`) to prevent conflicts with any local PostgreSQL instance already running on your machine.*

### 3. Server Setup & Database Migration
```bash
cd server
npm install
npm run db:push     # Synchronizes schema with PostgreSQL
npm run db:seed     # Seeds Admin, test users, sample OTT listings & chats
npm run dev         # Launches Express API on port 5000
```

### 4. Client Setup & Launch
In a new terminal:
```bash
cd client
npm install
npm run dev         # Launches Next.js on port 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Pre-Seeded Test Credentials

The database seeder (`server/prisma/seed.ts`) populates the system with realistic data and ready-to-test accounts. You can also use the one-click credential buttons on the login page:

| Role | Username | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `StreamModerator` | `admin@streamshare.io` | `AdminSecurePass2026!` | Access `/admin/chats`, view all transcripts, ban users, suspend listings |
| **User (Seller)** | `AliceTech` | `alice@streamshare.io` | `UserSecurePass2026!` | Netflix 4K and Spotify Family listing owner |
| **User (Seller)** | `BobCinema` | `bob@streamshare.io` | `UserSecurePass2026!` | Disney+ Trio Bundle and YouTube Premium listing owner |
| **User (Buyer)** | `CharlieBinge` | `charlie@streamshare.io` | `UserSecurePass2026!` | Amazon Prime Video owner; Buyer chatting with Alice |

---

## API Endpoint Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create account (rate-limited, password complexity verified).
- `POST /api/auth/login` - Authenticate with credentials; receives access token and HttpOnly refresh cookie.
- `POST /api/auth/refresh` - Rotate refresh token and obtain new short-lived access token.
- `POST /api/auth/logout` - Revoke refresh token and clear cookies.
- `GET /api/auth/me` - Retrieve authenticated user profile.

### Classifieds Listings (`/api/listings`)
- `GET /api/listings` - Browse listings with filtering (`category`, `platform`, `search`, `minPrice`, `maxPrice`, `status`, `sortBy`).
- `GET /api/listings/:id` - Fetch listing details and owner information.
- `POST /api/listings` - Create new OTT listing (authenticated).
- `PUT /api/listings/:id` - Update listing details or mark as SOLD (owner/admin only).
- `DELETE /api/listings/:id` - Remove listing (owner/admin only).

### Direct Chat (`/api/chat`)
- `GET /api/chat/conversations` - Retrieve user's conversation inbox with last message and unread counts.
- `POST /api/chat/conversations` - Start or retrieve conversation on a listing.
- `GET /api/chat/conversations/:id/messages` - Fetch conversation message history (participants & admin only).
- `POST /api/chat/conversations/:id/messages` - Send message (rate-limited, XSS sanitized, safety scanned).
- `POST /api/chat/messages/:messageId/flag` - Report message for admin moderation.

### Admin Moderation Panel (`/api/admin`) - Protected by IP & Role
- `GET /api/admin/dashboard` - Retrieve system statistics (total users, active listings, conversations, flagged count).
- `GET /api/admin/conversations` - Browse monitored conversations (supports `flaggedOnly=true`).
- `GET /api/admin/conversations/:id/transcript` - Inspect complete message history (automatically logs compliance audit).
- `POST /api/admin/messages/:messageId/review` - Dismiss flag or delete violating message.
- `POST /api/admin/users/:userId/ban` - Ban or unban user and invalidate active sessions.
- `POST /api/admin/listings/:listingId/status` - Suspend or reactivate listing.
- `GET /api/admin/audit-logs` - Inspect immutable administrative security actions.

---

## WebSocket Event Specifications

### Client -> Server Events
- `join_conversation({ conversationId }, callback)`: Joins the conversation room (`conversation:<id>`). Validates that the requesting socket is a participant or administrator.
- `leave_conversation({ conversationId })`: Leaves the conversation room.
- `send_message({ conversationId, content }, callback)`: Dispatches a message. Sanitizes content, evaluates safety rules, persists to PostgreSQL, and broadcasts to room.
- `typing_start({ conversationId })`: Emits typing indicator to counterpart.
- `typing_stop({ conversationId })`: Clears typing indicator.
- `mark_read({ conversationId })`: Updates unread messages in PostgreSQL and broadcasts read receipt.

### Server -> Client Events
- `new_message({ message, conversationId })`: Pushes real-time message to conversation participants.
- `conversation_updated({ conversationId, lastMessage, unreadIncrement })`: Pushes inbox notification to recipient's individual user room (`user:<userId>`).
- `user_typing({ conversationId, username })`: Displays "Username is typing..." banner.
- `user_stopped_typing({ conversationId })`: Clears typing indicator banner.
- `messages_marked_read({ conversationId, readBy })`: Updates double-check read status.
- `moderation_alert({ alertType, conversationId, messageId, sender, reason })`: Pushes instant surveillance notification to administrators connected to `admin:moderation`.

---

## Security Verification & Auditing

For details on encryption standards, OWASP top 10 defenses, token rotation lifecycle, and threat models, please consult **[SECURITY.md](SECURITY.md)**.

