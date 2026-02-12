export default async function handler(req, res) {
  try {
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
      return res.status(500).json({ error: "Missing Spotify env vars" });
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // 1) refresh access token
    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(500).json({ error: "Token refresh failed", details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // 2) now playing
    const nowResp = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    // 204 = nothing playing
    if (nowResp.status === 204) {
      return res.status(200).json({ isPlaying: false });
    }

    const now = await nowResp.json();
    if (!nowResp.ok) {
      return res.status(500).json({ error: "Now playing fetch failed", details: now });
    }

    const item = now.item;

    // sometimes item can be null
    if (!item) {
      return res.status(200).json({ isPlaying: false });
    }

    const cover =
      item.album?.images?.[0]?.url ||
      item.album?.images?.[1]?.url ||
      item.album?.images?.[2]?.url ||
      "";

    return res.status(200).json({
      isPlaying: !!now.is_playing,
      title: item.name || "",
      artist: (item.artists || []).map(a => a.name).join(", "),
      cover,
      url: item.external_urls?.spotify || "https://open.spotify.com",
      // ✅ ВОТ ЭТИ ДВА ПОЛЯ ДЛЯ РЕАЛЬНОГО ОТСЧЁТА:
      progressMs: typeof now.progress_ms === "number" ? now.progress_ms : null,
      durationMs: typeof item.duration_ms === "number" ? item.duration_ms : null,
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
}
