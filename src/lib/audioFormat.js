// Real audio codec / container detection.
//
// The technical-details panel used to just assume the container/codec from
// which of the two playback paths served the track (proxied "full" stream
// vs. preview clip) — e.g. "full = webm/opus, preview = mp3". That's a
// guess, not a measurement: the backend can fall back to a different itag
// or container depending on what's actually available for a given video,
// so a track labelled "full" isn't guaranteed to be webm/opus.
//
// This sniffs the real file instead. A small ranged fetch pulls back the
// first few KB of the actual stream — enough to read the container's magic
// bytes, and for containers that can hold more than one codec (WebM/Ogg),
// to find the codec-id string that sits in the header metadata near the
// start of the file.

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("latin1") : null;

function toAsciiWindow(bytes) {
  if (textDecoder) return textDecoder.decode(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function bytesEqual(bytes, offset, sequence) {
  if (offset < 0 || offset + sequence.length > bytes.length) return false;
  for (let i = 0; i < sequence.length; i++) {
    if (bytes[offset + i] !== sequence[i]) return false;
  }
  return true;
}

function asciiAt(bytes, offset, str) {
  const seq = [];
  for (let i = 0; i < str.length; i++) seq.push(str.charCodeAt(i));
  return bytesEqual(bytes, offset, seq);
}

// Large enough that a WebM/Ogg container's codec-id metadata (which sits
// right after the file header, not scattered through the stream) is
// virtually always inside this window.
const SNIFF_BYTES = 8192;

const detectCache = new Map(); // url -> Promise<result|null>

function identify(bytes, contentType) {
  const ascii = toAsciiWindow(bytes);

  if (asciiAt(bytes, 0, "fLaC")) {
    return { label: "FLAC", mimeType: "audio/flac", codec: "flac", container: "FLAC" };
  }
  if (asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WAVE")) {
    return { label: "WAV", mimeType: "audio/wav", codec: "pcm", container: "WAV" };
  }
  if (bytesEqual(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    // EBML — WebM or Matroska. Both Opus and Vorbis audio can live in this
    // container; the codec ID ("A_OPUS" / "A_VORBIS") shows up as plain
    // ASCII in the Tracks element near the start of the file.
    if (ascii.includes("A_OPUS")) return { label: "OPUS", mimeType: "audio/webm", codec: "opus", container: "WebM" };
    if (ascii.includes("A_VORBIS")) return { label: "VORBIS", mimeType: "audio/webm", codec: "vorbis", container: "WebM" };
    return { label: "WEBM", mimeType: contentType || "audio/webm", codec: "unknown", container: "WebM" };
  }
  if (asciiAt(bytes, 0, "OggS")) {
    if (ascii.includes("OpusHead")) return { label: "OPUS", mimeType: "audio/ogg", codec: "opus", container: "Ogg" };
    if (ascii.includes("vorbis")) return { label: "VORBIS", mimeType: "audio/ogg", codec: "vorbis", container: "Ogg" };
    return { label: "OGG", mimeType: contentType || "audio/ogg", codec: "unknown", container: "Ogg" };
  }
  if (asciiAt(bytes, 4, "ftyp")) {
    return { label: "AAC", mimeType: "audio/mp4", codec: "aac", container: "MP4" };
  }
  if (asciiAt(bytes, 0, "ID3") || (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { label: "MP3", mimeType: "audio/mpeg", codec: "mp3", container: "MP3" };
  }
  if (contentType) {
    // Nothing recognizable in the bytes we sniffed — fall back to whatever
    // the server told us it is, if anything, rather than showing nothing.
    const short = contentType.split(";")[0].trim();
    const label = (short.split("/")[1] || short).toUpperCase();
    return { label, mimeType: short, codec: "unknown", container: "unknown" };
  }
  return null;
}

// Detects the real container/codec of the audio file at `url` via a ranged
// fetch. Results are cached per URL (stream URLs are per-track and
// short-lived tickets, so this never grows unbounded in practice).
//
// IMPORTANT: only successful detections get cached long-term. A transient
// failure (network blip, upstream not ready yet, aborted request) used to
// get cached as `null` forever for that URL — since the same stream ticket
// URL is reused for repeat plays within its ~10min TTL, one bad sniff meant
// the codec badge silently stayed hidden for every replay of that track
// until the ticket expired. Now a failed attempt is evicted immediately so
// the next play (or the caller) can simply try again.
export function detectAudioFormat(url) {
  if (!url) return Promise.resolve(null);
  if (detectCache.has(url)) return detectCache.get(url);

  const promise = fetch(url, { headers: { Range: `bytes=0-${SNIFF_BYTES - 1}` } })
    .then(async (res) => {
      if (!res.ok && res.status !== 206) { detectCache.delete(url); return null; }
      const contentType = res.headers.get("content-type");
      const buf = new Uint8Array(await res.arrayBuffer());
      const result = identify(buf, contentType);
      if (!result) detectCache.delete(url);
      return result;
    })
    .catch(() => { detectCache.delete(url); return null; });

  detectCache.set(url, promise);
  return promise;
}

export function clearAudioFormatCache(url) {
  if (url) detectCache.delete(url);
  else detectCache.clear();
}

// Deteksi sekali: browser ini bisa decode Opus/WebM lewat elemen <audio>
// native atau nggak. Safari (desktop & iOS) TIDAK bisa — jadi buat mereka
// kita minta backend paksa kasih AAC/m4a walau bitrate-nya lebih rendah
// daripada Opus, karena m4a yang jalan > Opus yang nggak bisa diputar.
let cachedAudioQuality = null;
export function getPreferredAudioQuality() {
  if (cachedAudioQuality) return cachedAudioQuality;
  try {
    const probe = document.createElement("audio");
    const canOpus = probe.canPlayType('audio/webm; codecs="opus"') !== "";
    cachedAudioQuality = canOpus ? "high" : "compatible";
  } catch {
    cachedAudioQuality = "compatible";
  }
  return cachedAudioQuality;
}
