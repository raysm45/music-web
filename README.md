<div align="center">

# 🎵 Aivy

**A fast, modern web music player — search, stream, listen together, and enjoy synced lyrics, all in your browser.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black?logo=socket.io&logoColor=white)](https://socket.io)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](#license)

</div>

---

## ✨ Features

- 🔍 **Search & Browse** — find tracks, artists, and albums in seconds
- 📚 **Personal Library** — playlists, liked songs, and imports
- 🎬 **Shorts** — swipeable short-form music video feed
- 👥 **Listen Together** — real-time synced rooms (public/private, host-controlled, password-protected) powered by Socket.IO
- 🕹️ **Discord Activity** — launch and play directly inside a Discord voice call
- 📝 **Synced Lyrics** — line-by-line lyrics view while you listen
- 🌐 **Multi-language** — English & Bahasa Indonesia out of the box
- 📱 **Responsive UI** — polished desktop layout and a dedicated mobile experience (mini player, bottom sheets, tab bar)
- 🟢 **Live Status Awareness** — automatic, non-intrusive backend health detection with graceful reconnect
- 🔐 **OAuth Login** — sign in with Google or Discord

---

## 🛠️ Tech Stack

| Layer       | Tech                                              |
|-------------|----------------------------------------------------|
| UI          | React 18, Vite 5                                   |
| Realtime    | Socket.IO Client                                   |
| Icons       | Lucide React                                       |
| Lyrics      | Lit (custom `am-lyrics` web component)             |
| Integrations| Discord Embedded App SDK                           |
| Deployment  | Vercel-ready (`vercel.json` included)              |

> This is the **frontend** application. It talks to a companion Node.js/Express backend for search, streaming, auth, and realtime rooms.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A running instance of the [Aivy backend](#) (or access to a hosted one)

### Installation

```bash
git clone <this-repo-url>
cd aivy-frontend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Base URL of the backend API (defaults to the production API if omitted)
VITE_API_BASE=http://localhost:3000

# Discord Client ID (only needed for the Discord Activity integration)
VITE_DISCORD_CLIENT_ID=your_discord_client_id
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/          # Route-level views (Home, Search, Library, Rooms, Shorts, Settings, Auth...)
│   ├── components.jsx  # Shared UI components (player bar, sidebar, modals, sheets, etc.)
│   ├── context.jsx     # Global providers — UI state & the audio Player
│   ├── router.jsx      # Lightweight client-side router
│   ├── lib/            # API client, i18n, health check, utilities
│   └── vendor/         # Vendored third-party integrations (am-lyrics)
├── public/              # Static assets & service worker
├── main.jsx             # App entry point
└── vite.config.js       # Vite configuration
```

---

## 🩺 Backend Health Detection

The app silently pings the backend in the background. If the connection genuinely drops (not just a background-tab throttle), a friendly **Server Down** screen appears as an overlay — without interrupting playback — and the app reconnects automatically once the backend is reachable again.

---

## 🙏 Credits & Open Source

Aivy is built on top of the amazing work of the open-source community. Huge thanks to the authors and maintainers of the following projects:

### Frontend

| Project | Description | Repository |
|---|---|---|
| React | UI library powering the whole app | [facebook/react](https://github.com/facebook/react) |
| Vite | Build tool & dev server | [vitejs/vite](https://github.com/vitejs/vite) |
| @vitejs/plugin-react | Official React plugin for Vite | [vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) |
| Lit | Web components used for the lyrics view | [lit/lit](https://github.com/lit/lit) |
| Lucide | Icon set used throughout the UI | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) |
| Socket.IO Client | Realtime engine for Listen Together rooms | [socketio/socket.io-client](https://github.com/socketio/socket.io-client) |
| Discord Embedded App SDK | Powers the in-Discord Activity experience | [discord/embedded-app-sdk](https://github.com/discord/embedded-app-sdk) |

### Vendored

| Project | Description | Repository |
|---|---|---|
| am-lyrics | Synced, animated lyrics web component (vendored & adapted in `src/vendor/am-lyrics`) | [binimum/am-lyrics](https://github.com/binimum/am-lyrics) |

### Backend

| Project | Description | Repository |
|---|---|---|
| Express | HTTP server framework | [expressjs/express](https://github.com/expressjs/express) |
| Socket.IO | Realtime engine (server side) | [socketio/socket.io](https://github.com/socketio/socket.io) |
| mysql2 | MySQL client/driver | [sidorares/node-mysql2](https://github.com/sidorares/node-mysql2) |
| cors | CORS middleware | [expressjs/cors](https://github.com/expressjs/cors) |
| cookie-parser | Cookie parsing middleware | [expressjs/cookie-parser](https://github.com/expressjs/cookie-parser) |
| dotenv | Environment variable loader | [motdotla/dotenv](https://github.com/motdotla/dotenv) |
| jsonwebtoken | JWT signing & verification for auth | [auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) |
| jsdom | DOM implementation used server-side | [jsdom/jsdom](https://github.com/jsdom/jsdom) |
| node-cache | In-memory caching | [node-cache/node-cache](https://github.com/node-cache/node-cache) |
| p-queue | Promise queue with concurrency control | [sindresorhus/p-queue](https://github.com/sindresorhus/p-queue) |
| sharp | Image processing (thumbnails, covers) | [lovell/sharp](https://github.com/lovell/sharp) |
| undici | HTTP client used for outbound requests | [nodejs/undici](https://github.com/nodejs/undici) |
| youtubei.js | YouTube InnerTube client used for search/streaming | [LuanRT/YouTube.js](https://github.com/LuanRT/YouTube.js) |
| BgUtils (bgutils-js) | Generates PoTokens / BotGuard attestation for YouTube access | [LuanRT/BgUtils](https://github.com/LuanRT/BgUtils) |
| yt-search | Lightweight YouTube search | [talmobi/yt-search](https://github.com/talmobi/yt-search) |

> 📌 If any of these libraries are updated or swapped out, please keep this table in sync.

## 🤝 Contributing

Issues and pull requests are welcome. Please open an issue first to discuss significant changes.

## 📄 License

This project is currently unlicensed / proprietary. Contact the maintainer for usage terms.

---

<div align="center">
Made by Aivy team
</div>
