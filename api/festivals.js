module.exports = async (req, res) => {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = "omaturi";

    if (!SHEET_ID) {
      return res.status(500).json({ error: "Missing SHEET_ID env var" });
    }

    // 1행: 헤더, 2행부터: 데이터 (전체 행 조회)
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
      `?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}` +
      `&tq=${encodeURIComponent('select * offset 1')}`; // 2행부터 데이터 시작

    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substring(47, text.length - 2));

    const festivals = json.table.rows.map(row => ({
      country: row.c[0]?.v || "",      // A
      airport: row.c[1]?.v || "",      // B
      name: row.c[2]?.v || "",         // C
      startDate: row.c[3]?.v || "",    // D
      endDate: row.c[4]?.v || "",      // E
      description: row.c[5]?.v || "",  // F
      imageUrl: row.c[6]?.v || "",     // G
      locality: row.c[7]?.v || "",     // H
      lng: row.c[8]?.v || 0,           // I
      lat: row.c[9]?.v || 0,           // J
      address: row.c[10]?.v || "",     // K
      attendance: row.c[11]?.v || 0,   // L
      label: row.c[12]?.v || "",       // M (플래그로 사용)
      // N열: 행복한 휴가 노출 여부 (체크박스 true 또는 문자 Y/y)
      isHighlight: (() => {
        const raw = row.c[13]?.v;
        if (raw === true) return "Y";
        const s = String(raw ?? "").toUpperCase().trim();
        return s === "Y" ? "Y" : "";
      })()
    })).filter(item => item.name);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(festivals);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch festivals" });
  }
};