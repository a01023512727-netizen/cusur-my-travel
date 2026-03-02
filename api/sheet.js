module.exports = async (req, res) => {
  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = process.env.SHEET_NAME || "Main";
    const RANGE = process.env.SHEET_RANGE || "A1:B1";

    if (!SHEET_ID) {
      return res.status(500).json({ error: "Missing SHEET_ID env var" });
    }

    const url =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
      `?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}` +
      `&range=${encodeURIComponent(RANGE)}`;

    const response = await fetch(url);
    const text = await response.text();

    const json = JSON.parse(text.substring(47, text.length - 2));
    const row = json?.table?.rows?.[0]?.c || [];

    const title = row?.[0]?.v || "기본 제목";
    const subtitle = row?.[1]?.v || "기본 문구";

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ title, subtitle });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load sheet data" });
  }
};
