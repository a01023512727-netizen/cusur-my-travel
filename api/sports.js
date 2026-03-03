module.exports = async (req, res) => {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = "Sports";

    if (!SHEET_ID) {
      return res.status(500).json({ error: "Missing SHEET_ID env var" });
    }

    // 1행 헤더, 2행부터 데이터. 컬럼은 A부터 추가될 수 있어 한정하지 않음.
    const url =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
      `?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}` +
      `&tq=${encodeURIComponent("select * offset 1")}`;

    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substring(47, text.length - 2));

    const get = (c, i) => {
      const v = c[i]?.v;
      if (v === undefined || v === null) return "";
      return String(v).trim();
    };

    // 순서: 국가, 공항코드, strLeague, strFilename, strSeason, strHomeTeam, strAwayTeam,
    //       dateEvent, strTime, strHomeTeamBadge, strAwayTeamBadge, strPoster, strThumb, strVideo, strStatus, strLeagueBadge
    const sports = (json.table?.rows || []).map((row) => {
      const c = row.c || [];
      return {
        country: get(c, 0),              // A: 국가
        airportCode: get(c, 1),          // B: 공항코드
        strLeague: get(c, 2),            // C: strLeague
        strFilename: get(c, 3),           // D: strFilename
        strSeason: get(c, 4),            // E: strSeason
        homeTeam: get(c, 5),             // F: strHomeTeam
        awayTeam: get(c, 6),             // G: strAwayTeam
        dateEvent: c[7]?.v,              // H: dateEvent
        strTime: c[8]?.v,                // I: strTime
        strHomeTeamBadge: get(c, 9),    // J
        strAwayTeamBadge: get(c, 10),   // K
        strPoster: get(c, 11),           // L
        strThumb: get(c, 12),           // M
        strVideo: get(c, 13),            // N
        strStatus: get(c, 14),           // O
        strLeagueBadge: get(c, 15),      // P: strLeagueBadge
      };
    }).filter((item) => item.homeTeam || item.awayTeam);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(sports);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch sports data" });
  }
};
