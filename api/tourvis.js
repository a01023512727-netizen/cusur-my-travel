/**
 * TOURVIS OpenAPI 프록시
 * - 로컬: .env 의 TOURVIS_API_KEY 사용
 * - Vercel: 환경변수 TOURVIS_API_KEY 사용
 */
const TOURVIS_AIRPORTS_URL =
  "https://stella.tourvis.com/v3/openapi/getAirports?ssCode=BTMS&searchContext=TYO";

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.TOURVIS_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(500).json({
        error: "TOURVIS_API_KEY가 설정되지 않았습니다. .env 또는 Vercel 환경변수에 추가해 주세요.",
        code: "MISSING_TOURVIS_API_KEY",
      });
    }

    const response = await fetch(TOURVIS_AIRPORTS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    if (!response.ok) {
      res.status(response.status);
      return res.send(text);
    }

    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    console.error("TOURVIS API error:", e);
    const message = e.message || String(e);
    const cause = e.cause ? (e.cause.message || String(e.cause)) : null;
    return res.status(500).json({
      error: message,
      cause: cause || undefined,
      code: "TOURVIS_REQUEST_FAILED",
    });
  }
};
