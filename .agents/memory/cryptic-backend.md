---
name: Cryptic App Backend Architecture
description: Cryptic is a Matrix-themed messaging Expo app backed by a shared PostgreSQL API server, not local AsyncStorage
---

The app moved from purely local AsyncStorage to a shared PostgreSQL backend so users on different devices can find and message each other.

**DB tables** (lib/db/src/schema/): users, sessions, contacts, conversations, conversation_participants, messages

**API routes** (artifacts/api-server/src/routes/): auth.ts, users.ts, contacts.ts, conversations.ts

**Auth**: PBKDF2 password hashing (`salt:hash` stored in passwordHash column), random 64-char hex session tokens in sessions table, `requireAuth` middleware in middlewares/auth.ts

**Mobile API client**: artifacts/mobile/lib/api.ts — uses window.location.origin for web base URL, EXPO_PUBLIC_DOMAIN env var for native

**Real-time**: Chat screen polls every 3 seconds via `pollMessages(id)` / `stopPolling()` from MessagesContext; MessagesContext exposes both

**Why:** AsyncStorage is per-device/per-browser, so users on different devices could never discover each other or exchange messages.

**How to apply:** Any new data that needs to be shared between users must go through the API/DB, not AsyncStorage. AsyncStorage is only used for the session token (cryptic_token key).
