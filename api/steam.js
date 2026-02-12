export default async function handler(req, res) {
  try {
    const key = process.env.STEAM_API_KEY;
    const steamid = "76561199064708359";

    if (!key) return res.status(500).json({ error: "Missing STEAM_API_KEY" });

    const summariesUrl =
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${steamid}`;

    const recentUrl =
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${encodeURIComponent(key)}&steamid=${steamid}&count=6`;

    const [summariesRes, recentRes] = await Promise.all([
      fetch(summariesUrl, { headers: { "User-Agent": "bio-site/1.0" } }),
      fetch(recentUrl, { headers: { "User-Agent": "bio-site/1.0" } }),
    ]);

    const summaries = await summariesRes.json();
    const recent = await recentRes.json();

    const p = summaries?.response?.players?.[0];
    if (!p) return res.status(200).json({ ok: false });

    const stateMap = {
      0: "Offline",
      1: "Online",
      2: "Busy",
      3: "Away",
      4: "Snooze",
      5: "Trade",
      6: "Play",
    };

    const games = recent?.response?.games || [];

    // add nice image urls (header/capsule)
    const gamesOut = games.map(g => ({
      appid: g.appid,
      name: g.name || "",
      playtime_2weeks_min: g.playtime_2weeks ?? 0,
      playtime_forever_min: g.playtime_forever ?? 0,
      img: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
    }));

    res.status(200).json({
      ok: true,
      personaName: p.personaname || "",
      profileUrl: p.profileurl || `https://steamcommunity.com/profiles/${steamid}/`,
      avatar: p.avatarfull || p.avatarmedium || p.avatar || "",
      status: stateMap[p.personastate] ?? "Unknown",
      isInGame: !!p.gameextrainfo,
      gameName: p.gameextrainfo || "",
      gameId: p.gameid ? Number(p.gameid) : null,
      recent: gamesOut,
    });
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
}