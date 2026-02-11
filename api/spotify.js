// api/spotify.js
export default async function handler(req, res) {
  try {
    const {
      SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET,
      SPOTIFY_REFRESH_TOKEN,
    } = process.env;

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
      return res.status(500).json({ error: "missing_env" });
    }

    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

    // 1) refresh -> access token
    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(500).json({ error: "token_error", details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // 2) now playing
    const nowResp = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (nowResp.status === 204) {
      return res.status(200).json({ isPlaying: false });
    }

    const nowData = await nowResp.json();
    if (!nowResp.ok) {
      return res.status(500).json({ error: "now_playing_error", details: nowData });
    }

    const item = nowData.item;
    return res.status(200).json({
      isPlaying: nowData.is_playing,
      title: item?.name ?? "",
      artist: item?.artists?.map(a => a.name).join(", ") ?? "",
      cover: item?.album?.images?.[0]?.url ?? "",
      url: item?.external_urls?.spotify ?? "",
    });
  } catch (e) {
    return res.status(500).json({ error: "server_error", message: String(e) });
  }
}
