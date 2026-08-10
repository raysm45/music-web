import { useEffect, useRef, useCallback } from "react";
import { Api } from "./api.js";

function isInsideDiscord() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id") && params.has("instance_id");
}

export function useDiscordActivity() {
  const sdkRef = useRef(null);
  const readyRef = useRef(false);
  const lastActivityRef = useRef(null);

  const applyActivity = useCallback((sdk, activity) => {
    if (!sdk?.commands?.setActivity) return;
    sdk.commands.setActivity({ activity }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isInsideDiscord()) return;
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        const { DiscordSDK } = await import("@discord/embedded-app-sdk");
        const sdk = new DiscordSDK(clientId);
        await sdk.ready();
        if (cancelled) return;

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "rpc.activities.write"],
        });

        const tokenRes = await Api.discordActivityToken(code);
        if (cancelled || !tokenRes?.access_token) return;

        await sdk.commands.authenticate({ access_token: tokenRes.access_token });
        if (cancelled) return;

        sdkRef.current = sdk;
        readyRef.current = true;
        if (lastActivityRef.current) applyActivity(sdk, lastActivityRef.current);
      } catch {
        readyRef.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, [applyActivity]);

  const updateActivity = useCallback(({ title, artist, cover, isPlaying }) => {
    if (!title) return;
    const activity = {
      type: 2,
      details: title.slice(0, 128),
      state: (artist ? `${isPlaying ? "Mendengarkan" : "Dijeda"} \u00b7 ${artist}` : (isPlaying ? "Mendengarkan" : "Dijeda")).slice(0, 128),
      assets: cover ? { large_image: cover, large_text: title.slice(0, 128) } : undefined,
      timestamps: isPlaying ? { start: Date.now() } : undefined,
    };
    lastActivityRef.current = activity;
    if (readyRef.current && sdkRef.current) applyActivity(sdkRef.current, activity);
  }, [applyActivity]);

  return { updateActivity, isInsideDiscord: isInsideDiscord() };
}
