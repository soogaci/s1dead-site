export default async function handler(req, res) {
  try {
    const key = process.env.STEAM_API_KEY;
    const steamid = "76561199064708359";

    if (!key) {
      return res.status(500).json({ error: "Missing STEAM_API_KEY" });
    }

    const url =
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${steamid}`;

    const r = await fetch(url, { headers: { "User-Agent": "bio-site/1.0" } });
    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({ error: "Steam API error", details: data });
    }

    const p = data?.response?.players?.[0];
    if (!p) return res.status(200).json({ ok: false });

    // personastate: 0 Offline, 1 Online, 2 Busy, 3 Away, 4 Snooze, 5 LookingToTrade, 6 LookingToPlay
    const stateMap = {
      0: "Offline",
      1: "Online",
      2: "Busy",
      3: "Away",
      4: "Snooze",
      5: "Trade",
      6: "Play",
    };

    res.status(200).json({
      ok: true,
      personaName: p.personaname || "",
      profileUrl: p.profileurl || `https://steamcommunity.com/profiles/${steamid}/`,
      avatar: p.avatarfull || p.avatarmedium || p.avatar || "",
      status: stateMap[p.personastate] ?? "Unknown",
      isInGame: !!p.gameextrainfo,
      gameName: p.gameextrainfo || "",
      gameId: p.gameid || null,
    });
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
}