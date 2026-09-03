import React, { useState, useEffect } from "react";
import { MaintenancePage } from "./pages/MaintenancePage.jsx";
import { ServerDownPage } from "./pages/ServerDownPage.jsx";
import { useBackendHealth } from "./lib/health.js";
import { RouterProvider, useRouter } from "./router.jsx";
import {
  UIProvider, PlayerProvider, useUI, usePlayer,
  SIDEBAR_COLLAPSED_W, RIGHTPANEL_COLLAPSED_W, RIGHTPANEL_PEEK_W,
} from "./context.jsx";
import {
  ErrorBoundary, Sidebar, MobileTabBar, TopBar, PlayerBar, MiniPlayer, NowPlayingSheet, QueueSheet,
  RightPanel, GlobalContextMenu, AddToPlaylistModal, CreditsModal, ToastHost, ViewLoading, LyricsOverlay,
  LyricsPrefetch,
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
  const { authChecked, authUser, sidebarWidth, sidebarCollapsed, rightPanelWidth, rightPanelCollapsed, rightPanelPeek, mobileQueueOpen, openMobileQueue, closeMobileQueue } = useUI();
  const { currentTrack } = usePlayer();
  const isMobile = useIsMobile(860);
  const isPanelCompact = useIsMobile(1240);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  if (!authChecked) return <div className="aivy-boot"><ViewLoading /></div>;
  if (name === "landing") return <LandingPage />;
  if (name === "login")
    return <LoginPage />;

  if (!authUser)
    return <LoginPage />;

  const Page = PAGE_BY_ROUTE[name] || HomePage;
  const isImmersiveShorts = isMobile && name === "shorts";

  const shellStyle = {
    "--sidebar-w": sidebarCollapsed ? `${SIDEBAR_COLLAPSED_W}px` : `${sidebarWidth}px`,
  };
  if (!isPanelCompact) {
    shellStyle["--rightpanel-w"] = rightPanelCollapsed
      ? `${RIGHTPANEL_COLLAPSED_W + (rightPanelPeek ? RIGHTPANEL_PEEK_W : 0)}px`
      : `${rightPanelWidth}px`;
  }

  return (
    <div className={`aivy-shell ${isMobile ? "is-mobile" : ""} ${rightPanelCollapsed && rightPanelPeek ? "is-rightpanel-peeking" : ""}`} style={shellStyle}>
      {!isMobile && <Sidebar />}
      <main className="aivy-main">
        {!isImmersiveShorts && <TopBar isMobile={isMobile} />}
        <div id="aivy-content-scroll" className={`aivy-content aivy-scroll ${isMobile ? "is-mobile" : ""} ${name === "shorts" ? "no-pad" : ""} ${name === "home" ? "home-full" : ""}`}
          style={{ paddingBottom: name === "shorts" ? 0 : (isMobile ? (currentTrack ? 150 : 84) : (currentTrack ? 118 : 24)) }}>
          <ErrorBoundary key={name + JSON.stringify(params)}><Page /></ErrorBoundary>
        </div>
      </main>
      {!isMobile && <PlayerBar />}
      {!isMobile && <RightPanel />}

      {isMobile && !isImmersiveShorts && <MiniPlayer onExpand={() => setNowPlayingOpen(true)} />}
      {isMobile && <LyricsPrefetch />}
      {isMobile && !isImmersiveShorts && <MobileTabBar />}
      {/* Closing here intentionally leaves `lyricsOpen` untouched (no closeLyrics()) so
          that dismissing the sheet while lyrics are showing — by swipe or tap — and
          reopening it (mini player tap/swipe-up) brings the user right back to lyrics
          instead of resetting to the cover view. */}
      {isMobile && <NowPlayingSheet open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} onOpenQueue={() => { setNowPlayingOpen(false); openMobileQueue(); }} />}
      {isMobile && <QueueSheet open={mobileQueueOpen} onClose={closeMobileQueue} />}

      <AddToPlaylistModal />
      <CreditsModal />
      <LyricsOverlay />
      <GlobalContextMenu />
      <ToastHost isMobile={isMobile} />
    </div>
  );
}

//MODE MAINTENANCE ON/OFF — override manual, buat maintenance TERJADWAL
// (nge-flag true walau backend sebenarnya masih hidup, mis. lagi migrasi DB).
const MANUAL_MAINTENANCE_MODE = false;

export default function App() {
  // Deteksi OTOMATIS (frontend only, nggak butuh endpoint apa pun di
  // backend): ping backend tiap beberapa detik. Kalau backend nggak
  // kebalas sama sekali (down, crash, network putus, dst), tampilin
  // ServerDownPage — statis, simpel, beda dari MaintenancePage yang penuh
  // animasi buat maintenance TERJADWAL. Terus jalan mantau di background
  // walau lagi nampilin halaman ini, jadi begitu backend hidup lagi,
  // otomatis balik ke app normal.
  const { down: backendDown, retryInSeconds, retryNow } = useBackendHealth();

  if (MANUAL_MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }
  if (backendDown) {
    return <ServerDownPage retryInSeconds={retryInSeconds} onRetryNow={retryNow} />;
  }

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
