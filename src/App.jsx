import React, { useState, useEffect } from "react";
import { RouterProvider, useRouter } from "./router.jsx";
import { UIProvider, PlayerProvider, useUI, usePlayer } from "./context.jsx";
import {
  ErrorBoundary, Sidebar, MobileTabBar, TopBar, PlayerBar, MiniPlayer, NowPlayingSheet,
  RightPanel, GlobalContextMenu, AddToPlaylistModal, ToastHost, ViewLoading, LyricsOverlay,
} from "./components.jsx";
import { LandingPage, LoginPage } from "./pages/AuthPages.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";
import { ArtistPage, AlbumPage } from "./pages/CatalogPages.jsx";
import { LibraryPage, LikedPage, PlaylistPage, ImportPage } from "./pages/LibraryPages.jsx";
import { RoomLobbyPage, RoomPage } from "./pages/RoomPages.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

function useIsMobile(breakpoint = 860) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(`(max-width:${breakpoint}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, [breakpoint]);
  return isMobile;
}

const PAGE_BY_ROUTE = {
  home: HomePage,
  search: SearchPage,
  library: LibraryPage,
  libraryImport: ImportPage,
  liked: LikedPage,
  playlist: PlaylistPage,
  artist: ArtistPage,
  album: AlbumPage,
  roomLobby: RoomLobbyPage,
  room: RoomPage,
  settings: SettingsPage,
};

function AppInner() {
  const { name, params } = useRouter();
  const { authChecked, authUser } = useUI();
  const { currentTrack } = usePlayer();
  const isMobile = useIsMobile(860);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  if (!authChecked) return <div className="aivy-boot"><ViewLoading /></div>;
  if (name === "landing") return <LandingPage />;
  if (name === "login") return <LoginPage />;

  // Semua route lain butuh login. Belum login -> tampilin halaman login,
  // bukan dibiarin nyoba render halaman yang datanya bakal gagal dimuat.
  if (!authUser) return <LoginPage />;

  const Page = PAGE_BY_ROUTE[name] || HomePage;

  return (
    <div className={`aivy-shell ${isMobile ? "is-mobile" : ""}`}>
      {!isMobile && <Sidebar />}
      <main className="aivy-main">
        <TopBar isMobile={isMobile} />
        <div id="aivy-content-scroll" className={`aivy-content aivy-scroll ${isMobile ? "is-mobile" : ""}`}
          style={{ paddingBottom: isMobile ? (currentTrack ? 150 : 84) : 24 }}>
          <ErrorBoundary key={name + JSON.stringify(params)}><Page /></ErrorBoundary>
        </div>
      </main>
      {!isMobile && <PlayerBar />}
      {!isMobile && <RightPanel />}

      {isMobile && <MiniPlayer onExpand={() => setNowPlayingOpen(true)} />}
      {isMobile && <MobileTabBar />}
      {isMobile && <NowPlayingSheet open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} onOpenQueue={() => setNowPlayingOpen(false)} />}

      <AddToPlaylistModal />
      <LyricsOverlay />
      <GlobalContextMenu />
      <ToastHost isMobile={isMobile} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider>
        <UIProvider>
          <PlayerProvider>
            <AppInner />
          </PlayerProvider>
        </UIProvider>
      </RouterProvider>
    </ErrorBoundary>
  );
}