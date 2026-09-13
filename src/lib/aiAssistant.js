import { API_BASE } from "./api.js";

const AI_ENDPOINT = `${API_BASE}/api/ai-chat`;
const MAX_ROUNDS = 6;

async function executeTool(name, input, ctx, trackCache) {
  try {
    if (name === "search_tracks") {
      const results = await ctx.search(input.query);
      const mapped = (results || []).slice(0, 10).map((r) => {
        const id = r.videoId || r.id;
        const track = {
          id,
          videoId: id,
          title: r.title,
          cover: r.cover || r.thumbnail || null,
          artist: typeof r.artist === "string" ? { name: r.artist } : (r.artist || null),
          duration: r.duration || null,
        };
        trackCache.set(id, track);
        return { track_id: id, title: track.title, artist: track.artist?.name || null };
      });
      return { tracks: mapped };
    }

    if (name === "create_playlist_with_tracks") {
      const playlistId = await ctx.createPlaylist(input.name, input.description || "");
      if (!playlistId) return { error: "Gagal membuat playlist. Pastikan pengguna sudah login." };
      let added = 0;
      for (const id of input.track_ids || []) {
        const track = trackCache.get(id);
        if (track) { await ctx.addToPlaylist(playlistId, track); added += 1; }
      }
      return { playlist_id: playlistId, tracks_added: added };
    }

    if (name === "add_to_existing_playlist") {
      let added = 0;
      for (const id of input.track_ids || []) {
        const track = trackCache.get(id);
        if (track) { await ctx.addToPlaylist(input.playlist_id, track); added += 1; }
      }
      return { tracks_added: added };
    }

    if (name === "play_track") {
      const track = trackCache.get(input.track_id);
      if (!track) return { error: "track_id tidak dikenali. Panggil search_tracks dulu." };
      ctx.playSingle(track);
      return { ok: true, now_playing: track.title };
    }

    if (name === "list_playlists") {
      return {
        playlists: (ctx.playlists || []).map((p) => ({
          id: p.id,
          name: p.name,
          song_count: p.songs?.length ?? p.song_count ?? 0,
        })),
      };
    }

    return { error: `Tool tidak dikenal: ${name}` };
  } catch (err) {
    return { error: err?.message || "Tool gagal dijalankan." };
  }
}


/**
 * @param {string} userText
 * @param {Array} history
 * @param {object} ctx
 * @returns {Promise<{ text: string, history: Array }>}
 */
export async function runAiAssistantTurn(userText, history, ctx) {
  const trackCache = new Map();
  let messages = [...history, { role: "user", content: userText }];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      const msg = data?.error?.message || data?.error || "Permintaan ke AI gagal.";
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }

    const message = data?.choices?.[0]?.message || {};
    messages = [...messages, message];

    const toolCalls = message.tool_calls || [];
    if (!toolCalls.length) {
      const text = (message.content || "").trim();
      return { text: text || "...", history: messages };
    }

    for (const call of toolCalls) {
      let input = {};
      try { input = JSON.parse(call.function?.arguments || "{}"); } catch { input = {}; }
      const result = await executeTool(call.function?.name, input, ctx, trackCache);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { text: "Maaf, prosesnya kelamaan dan dihentikan. Coba minta lagi dengan lebih spesifik ya.", history: messages };
}