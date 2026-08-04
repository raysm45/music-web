import React, { useState, useEffect } from "react";
import { Users, Lock, Globe, Plus, LogIn, Play, Search as SearchIcon } from "lucide-react";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";
import { TrackRow, ViewLoading, Checkbox } from "../components.jsx";
import { relativeTime } from "../lib/utils.js";
import { Api } from "../lib/api.js";

export function RoomLobbyPage() {
  const { authUser, login, settings, t } = useUI();
  const { publicRooms, refreshPublicRooms, createRoom, joinRoom } = usePlayer();
  const { navigate } = useRouter();

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(settings.roomVisibilityDefault !== "private");
  const [password, setPassword] = useState("");
  const [hostOnlyControl, setHostOnlyControl] = useState(!!settings.hostOnlyControlDefault);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    refreshPublicRooms();
    const iv = setInterval(refreshPublicRooms, 8000);
    return () => clearInterval(iv);
  }, [refreshPublicRooms]);

  const handleCreate = async () => {
    setCreating(true);
    const room = await createRoom({ name: name.trim() || t("roomNameDefault"), isPublic, password: password || undefined, hostOnlyControl });
    setCreating(false);
    if (room) navigate("room", { params: { id: room.id } });
  };

  const handleJoin = async (id, needsPassword) => {
    setJoining(true);
    const room = await joinRoom(id, needsPassword ? joinPassword : undefined);
    setJoining(false);
    if (room) navigate("room", { params: { id: room.id } });
  };

  if (!authUser) {
    return (
      <div className="aivy-empty" style={{ paddingTop: 80 }}>
        <Users size={38} color="var(--ink-faint)" />
        <div className="title">{t("loginForRooms")}</div>
        <div className="sub">{t("loginForRoomsSub")}</div>
        <button className="aivy-btn-primary" onClick={login} style={{ marginTop: 6 }}>{t("navLoginDiscord")}</button>
      </div>
    );
  }

  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 6 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{t("listenTogether")}</h1>
        <p>{t("listenTogetherSub")}</p>
      </div>

      <div className="aivy-room-grid" style={{ marginTop: 18 }}>
        <div className="aivy-room-card">
          <h3>{t("createRoom")}</h3>
          <input className="aivy-input" placeholder={t("roomNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <input className="aivy-input" type="password" placeholder={t("passwordOptional")} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Checkbox checked={isPublic} onChange={setIsPublic} label={t("publicRoomHint")} />
          <Checkbox checked={hostOnlyControl} onChange={setHostOnlyControl} label={t("hostOnlyHint")} />
          <button className="aivy-btn-primary" disabled={creating} onClick={handleCreate}>{creating ? t("creatingRoom") : t("createRoomBtn")}</button>
        </div>
        <div className="aivy-room-card">
          <h3>{t("joinRoom")}</h3>
          <p>{t("joinRoomSub")}</p>
          <input className="aivy-input" placeholder={t("roomCodePlaceholder")} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8} style={{ textAlign: "center", letterSpacing: ".08em" }} />
          <input className="aivy-input" type="password" placeholder={t("passwordIfAny")} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} />
          <button className="aivy-btn-ghost" disabled={joining || !joinCode.trim()} onClick={() => handleJoin(joinCode.trim(), true)}><LogIn size={15} /> {t("join")}</button>
        </div>
      </div>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">{t("activePublicRooms")}</h2></div>
        {publicRooms.length === 0 ? (
          <div className="aivy-empty" style={{ paddingTop: 20 }}><div className="sub">{t("noPublicRooms")}</div></div>
        ) : (
          <div className="aivy-public-room-list">
            {publicRooms.map((r) => (
              <div key={r.id} className="aivy-public-room-row">
                <div className="info">
                  <div className="name">{r.name} {r.hasPassword && <Lock size={12} />}</div>
                  <div className="eyebrow">
                    {r.hostUsername ? `${t("by")} ${r.hostUsername} \u00b7 ` : ""}{r.memberCount}{` ${t("listeningCount")} \u00b7 ${t("createdAt")} ${relativeTime(r.createdAt)}`}
                  </div>
                  {r.nowPlayingTitle && <div className="nowplaying"><Play size={11} /> {r.nowPlayingTitle}</div>}
                </div>
                <button className="aivy-btn-ghost" onClick={() => handleJoin(r.id, r.hasPassword)}>{t("join")}</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function RoomPage() {
  const { params, navigate } = useRouter();
  const { room, joinRoom, addToQueueEnd } = usePlayer();
  const { authUser, t } = useUI();
  const [checked, setChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!authUser) return;
    if (room && room.id === params.id) { setChecked(true); return; }
    joinRoom(params.id, undefined).then((r) => { if (!r) navigate("roomLobby", { replace: true }); setChecked(true); });
  }, [params.id, authUser]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(() => { Api.search(search).then(setResults).catch(() => {}); }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  if (!authUser) { navigate("roomLobby", { replace: true }); return null; }
  if (!checked || !room) return <ViewLoading />;

  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 10 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{room.name}</h1>
        <p>{room.members?.length || 0} {t("membersListening")}</p>
      </div>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">{t("addToRoomQueue")}</h2></div>
        <div className="aivy-search-box" style={{ maxWidth: 420 }}>
          <SearchIcon size={16} />
          <input className="aivy-input" placeholder={t("searchToAdd")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {results.slice(0, 6).map((r) => (
              <div key={r.videoId} className="aivy-row">
                <div className="meta"><span className="t">{r.title}</span></div>
                <button className="aivy-icon-btn sm" onClick={() => { addToQueueEnd({ id: r.videoId, videoId: r.videoId, title: r.title, cover: r.thumbnail }); setSearch(""); setResults([]); }} aria-label={t("menuAddQueue")}><Plus size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">{t("roomQueue")}</h2></div>
        {room.queue?.length > 0 ? (
          <div>{room.queue.map((track, i) => <TrackRow key={track.id + i} track={track} index={i} list={room.queue} showIndex queueMode="queue" />)}</div>
        ) : (
          <div className="aivy-empty"><div className="sub">{t("roomQueueEmpty")}</div></div>
        )}
      </section>
    </div>
  );
}
