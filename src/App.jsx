import React, { useState, useEffect } from "react";
import { RouterProvider, useRouter } from "./router.jsx";
import { UIProvider, PlayerProvider, useUI, usePlayer } from "./context.jsx";
import {
  ErrorBoundary, Sidebar, MobileTabBar, TopBar, PlayerBar, MiniPlayer, NowPlayingSheet, QueueSheet,
  RightPanel, GlobalContextMenu, AddToPlaylistModal, ToastHost, ViewLoading, LyricsOverlay,
} from "./components.jsx";
import { LandingPage, LoginPage } from "./pages/AuthPages.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";
import { ArtistPage, AlbumPage } from "./pages/CatalogPages.jsx";
import { LibraryPage, LikedPage, PlaylistPage, ImportPage } from "./pages/LibraryPages.jsx";
import { RoomLobbyPage, RoomPage } from "./pages/RoomPages.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { ShortsPage } from "./pages/ShortsPage.jsx";

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
  shorts: ShortsPage,
  playlist: PlaylistPage,
  artist: ArtistPage,
  album: AlbumPage,
  roomLobby: RoomLobbyPage,
  room: RoomPage,
  settings: SettingsPage,
};

function AppInner() {
  const { name, params } = useRouter();
  const { authChecked, authUser, sidebarWidth, sidebarCollapsed, rightPanelWidth, rightPanelCollapsed } = useUI();
  const { currentTrack } = usePlayer();
  const isMobile = useIsMobile(860);
  const isPanelCompact = useIsMobile(1240);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  if (!authChecked) return <div className="aivy-boot"><ViewLoading /></div>;
  if (name === "landing") return <LandingPage />;
  if (name === "login")
    return <LoginPage />;

  if (!authUser)
    return <LoginPage />;

  const Page = PAGE_BY_ROUTE[name] || HomePage;
  const isImmersiveShorts = isMobile && name === "shorts";

  const shellStyle = {
    "--sidebar-w": sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
  };
  if (!isPanelCompact) {
    shellStyle["--rightpanel-w"] = rightPanelCollapsed ? "0px" : `${rightPanelWidth}px`;
  }

  return (
    <div className={`aivy-shell ${isMobile ? "is-mobile" : ""}`} style={shellStyle}>
      {!isMobile && <Sidebar />}
      <main className="aivy-main">
        {!isImmersiveShorts && <TopBar isMobile={isMobile} />}
        <div id="aivy-content-scroll" className={`aivy-content aivy-scroll ${isMobile ? "is-mobile" : ""} ${name === "shorts" ? "no-pad" : ""}`}
          style={{ paddingBottom: name === "shorts" ? 0 : (isMobile ? (currentTrack ? 150 : 84) : 24) }}>
          <ErrorBoundary key={name + JSON.stringify(params)}><Page /></ErrorBoundary>
        </div>
      </main>
      {!isMobile && <PlayerBar />}
      {!isMobile && <RightPanel />}

      {isMobile && !isImmersiveShorts && <MiniPlayer onExpand={() => setNowPlayingOpen(true)} />}
      {isMobile && !isImmersiveShorts && <MobileTabBar />}
      {isMobile && <NowPlayingSheet open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} onOpenQueue={() => { setNowPlayingOpen(false); setQueueOpen(true); }} />}
      {isMobile && <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />}

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