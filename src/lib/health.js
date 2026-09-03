import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./api.js";

// Otomatis nampilin layar "server down" kalau backend beneran nggak bisa
// dihubungi — FRONTEND ONLY, nggak butuh endpoint kesehatan apa pun di
// backend. Triknya: kita nggak peduli backend jawab apa (200, 404, 401,
// bahkan error JSON) — respons APA PUN dari server berarti prosesnya hidup
// dan bisa dihubungi. Yang dianggap "down" cuma kegagalan level jaringan:
// timeout, connection refused, DNS gagal, atau server mati total.
//
// Path yang dipanggil (`/__ping__`) sengaja nggak dijamin ada di route mana
// pun — biarpun backend balesnya cuma 404 "not found", itu tetap bukti sah
// kalau backend-nya hidup.

const CHECK_INTERVAL_UP_MS = 20_000;   // backend sehat: cek santai tiap 20 detik
const CHECK_INTERVAL_DOWN_MS = 5_000;  // backend down: cek lebih rapat biar cepat pulih balik
const FETCH_TIMEOUT_MS = 6_000;
// Jangan langsung nge-flag "down" dari 1 request yang gagal/telat sekali —
// itu bisa kejadian karena hiccup jaringan sesaat, bukan backend beneran mati.
const FAILURES_BEFORE_DOWN = 2;

function pingBackendAlive() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(`${API_BASE}/__ping__`, { signal: controller.signal, cache: "no-store" })
    // Respons apa pun (termasuk 404/401/500) = servernya hidup & bisa
    // dihubungi. Cuma network-level failure yang masuk .catch().
    .then(() => true)
    .catch(() => false)
    .finally(() => clearTimeout(timeout));
}

export function useBackendHealth() {
  const [down, setDown] = useState(false);
  const [retryInSeconds, setRetryInSeconds] = useState(null);
  const failuresRef = useRef(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const checkRef = useRef(() => {});

  useEffect(() => {
    let alive = true;

    const startCountdown = (seconds) => {
      clearInterval(countdownRef.current);
      setRetryInSeconds(seconds);
      countdownRef.current = setInterval(() => {
        setRetryInSeconds((s) => (s === null ? null : Math.max(0, s - 1)));
      }, 1000);
    };

    async function check() {
      clearTimeout(timerRef.current);
      const ok = await pingBackendAlive();
      if (!alive) return;

      if (ok) {
        failuresRef.current = 0;
        setDown(false);
        setRetryInSeconds(null);
        clearInterval(countdownRef.current);
        timerRef.current = setTimeout(check, CHECK_INTERVAL_UP_MS);
        return;
      }

      failuresRef.current += 1;
      if (failuresRef.current >= FAILURES_BEFORE_DOWN) {
        setDown(true);
        startCountdown(Math.round(CHECK_INTERVAL_DOWN_MS / 1000));
      }
      timerRef.current = setTimeout(check, CHECK_INTERVAL_DOWN_MS);
    }

    checkRef.current = check;
    check();
    return () => {
      alive = false;
      clearTimeout(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  // Buat tombol "Coba sekarang" — paksa cek ulang di luar jadwal, tanpa
  // nunggu countdown otomatis.
  const retryNow = () => checkRef.current();

  return { down, retryInSeconds, retryNow };
}
