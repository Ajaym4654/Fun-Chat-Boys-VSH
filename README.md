# Anon Fun Chat
A tiny, no-login, one-room chat for fun with friends. Live messages only. Files are kept in memory temporarily (default 60 minutes) and then vanish. No message history is stored.

## Features
- One global room. Everyone sees everything.
- Optional name; otherwise you're shown as "Anon".
- Emoji picker.
- Send text and any file type (up to 50 MB by default).
- Files are stored in memory only and auto-expire. **Server restart clears all files.**
- No database, no message logs.

## Quick Start
1. Make sure you have Node.js 18+ installed.
2. In the project folder, run:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000 in multiple devices/browsers and chat away.

## Config
- `PORT` (env): server port (default `3000`).
- `FILE_TTL_MINUTES` (env): how long uploaded files are kept in memory (default `60`).

Example:
```bash
FILE_TTL_MINUTES=30 PORT=8080 node server.js
```

## Notes
- This app is intentionally simple. There is **no authentication** and **no rate limiting**.
- Do **not** put it on the open internet without adding protections (CORS/rate limits/file size caps/moderation).
- For private fun, run it only on your LAN or behind a passworded reverse proxy.

Enjoy! ✨
