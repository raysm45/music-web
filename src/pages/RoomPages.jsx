import React, { useState, useEffect } from "react";
import { Users, Lock, Globe, Plus, LogIn, Play, Search as SearchIcon } from "lucide-react";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";
import { TrackRow, ViewLoading } from "../components.jsx";
import { relativeTime } from "../lib/utils.js";
import { Api } from "../lib/api.js";

export function RoomLobbyPage() {
  const { authUser, login } = useUI();
  const { publicRooms, refreshPublicRooms, createRoom, joinRoom } = usePlayer();
  const { navigate } = useRouter();

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [hostOnlyControl, setHostOnlyControl] = useState(false);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    refreshPublicRooms();
    const t = setInterval(refreshPublicRooms, 8000);
    return () => clearInterval(t);
  }, [refreshPublicRooms]);

  const handleCreate = async () => {
    setCreating(true);
    const room = await createRoom({ name: name.trim() || "Ruang tanpa nama", isPublic, password: password || undefined, hostOnlyControl });
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
        <div className="title">Login dulu buat dengerin bareng</div>
        <div className="sub">Ruang butuh akun biar bisa nampilin siapa aja yang lagi gabung.</div>
        <button className="aivy-btn-primary" onClick={login} style={{ marginTop: 6 }}>Masuk dengan Discord</button>
      </div>
    );
  }

  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 6 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>Dengerin bareng</h1>
        <p>Buka ruang, ajak temen, muter lagu yang sama, di waktu yang sama.</p>
      </div>

      <div className="aivy-room-grid" style={{ marginTop: 18 }}>
        <div className="aivy-room-card">
          <h3>Buat ruang</h3>
          <input className="aivy-input" placeholder="Nama ruang" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <input className="aivy-input" type="password" placeholder="Password (opsional)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="aivy-check-row"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Publik (muncul di daftar ruang)</label>
          <label className="aivy-check-row"><input type="checkbox" checked={hostOnlyControl} onChange={(e) => setHostOnlyControl(e.target.checked)} /> Cuma aku yang bisa kontrol pemutaran</label>
          <button className="aivy-btn-primary" disabled={creating} onClick={handleCreate}>{creating ? "Bikin ruang…" : "Buat ruang baru"}</button>
        </div>
        <div className="aivy-room-card">
          <h3>Gabung ruang</h3>
          <p>Punya kode dari temen? Masukin di sini.</p>
          <input className="aivy-input" placeholder="KODE RUANG" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8} style={{ textAlign: "center", letterSpacing: ".08em" }} />
          <input className="aivy-input" type="password" placeholder="Password (kalau ada)" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} />
          <button className="aivy-btn-ghost" disabled={joining || !joinCode.trim()} onClick={() => handleJoin(joinCode.trim(), true)}><LogIn size={15} /> Gabung</button>
        </div>
      </div>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">Ruang publik yang aktif</h2></div>
        {publicRooms.length === 0 ? (
          <div className="aivy-empty" style={{ paddingTop: 20 }}><div className="sub">Belum ada ruang publik yang lagi aktif. Coba buat satu!</div></div>
        ) : (
          <div className="aivy-public-room-list">
            {publicRooms.map((r) => (
              <div key={r.id} className="aivy-public-room-row">
                <div className="info">
                  <div className="name">{r.name} {r.hasPassword && <Lock size={12} />}</div>
                  <div className="eyebrow">
                    {r.hostUsername ? `oleh ${r.hostUsername} \u00b7 ` : ""}{r.memberCount}{` lagi dengerin \u00b7 dibuat ${relativeTime(r.createdAt)}`}
                  </div>
                  {r.nowPlayingTitle && <div className="nowplaying"><Play size={11} /> {r.nowPlayingTitle}</div>}
                </div>
                <button className="aivy-btn-ghost" onClick={() => handleJoin(r.id, r.hasPassword)}>Gabung</button>
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
  const { authUser } = useUI();
  const [checked, setChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!authUser) return;
    if (room && room.id === params.id) { setChecked(true); return; }
    joinRoom(params.id, undefined).then((r) => { if (!r) navigate("roomLobby", { replace: true }); setChecked(true); });
  }, [params.id, authUser]); // eslint-disable-line

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(() => { Api.search(search).then(setResults).catch(() => {}); }, 280);
    return () => clearTimeout(t);
  }, [search]);

  if (!authUser) { navigate("roomLobby", { replace: true }); return null; }
  if (!checked || !room) return <ViewLoading />;

  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 10 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{room.name}</h1>
        <p>{room.members?.length || 0} orang lagi dengerin bareng di sini.</p>
      </div>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">Tambah lagu ke antrean ruang</h2></div>
        <div className="aivy-search-box" style={{ maxWidth: 420 }}>
          <SearchIcon size={16} />
          <input className="aivy-input" placeholder="Cari lagu buat ditambahin" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {results.slice(0, 6).map((r) => (
              <div key={r.videoId} className="aivy-row">
                <div className="meta"><span className="t">{r.title}</span></div>
                <button className="aivy-icon-btn sm" onClick={() => { addToQueueEnd({ id: r.videoId, videoId: r.videoId, title: r.title, cover: r.thumbnail }); setSearch(""); setResults([]); }} aria-label="Tambah ke antrean"><Plus size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">Antrean ruang</h2></div>
        {room.queue?.length > 0 ? (
          <div>{room.queue.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} list={room.queue} showIndex />)}</div>
        ) : (
          <div className="aivy-empty"><div className="sub">Antrean masih kosong, tambahin lagu dari pencarian di atas.</div></div>
        )}
      </section>
    </div>
  );
}
