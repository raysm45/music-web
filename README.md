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

## 🤝 Contributing

Issues and pull requests are welcome. Please open an issue first to discuss significant changes.

## 📄 License

This project is currently unlicensed / proprietary. Contact the maintainer for usage terms.

---
