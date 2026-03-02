const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 고정 프롬프트 ID (필요하면 환경변수로 분리 가능)
const PROMPT_ID =
  process.env.OPENAI_PROMPT_ID ||
  "pmpt_69a58c634b788190bf98cde088dbc0a50117324d384ceef2";

function getTodayIsoDateSeoul() {
  // 서버가 UTC여도 한국 기준 날짜가 들어가도록 고정
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const yyyy = parts.find((p) => p.type === "year")?.value;
  const mm = parts.find((p) => p.type === "month")?.value;
  const dd = parts.find((p) => p.type === "day")?.value;
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, previous } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const inputMessages = [];

    if (previous && previous.question && previous.answer) {
      inputMessages.push(
        {
          role: "user",
          content: `이전 사용자 질문: ${previous.question}`,
        },
        {
          role: "assistant",
          content: `이전 AI JSON 응답: ${JSON.stringify(previous.answer)}`,
        }
      );
    }

    inputMessages.push({
      role: "user",
      content: message,
    });

    const response = await client.responses.create({
      prompt: {
        id: PROMPT_ID,
        variables: {
          today_date: getTodayIsoDateSeoul(),
        },
      },
      input: inputMessages,
      text: {
        format: {
          type: "text",
        },
      },
      max_output_tokens: 2048,
      store: true,
      include: ["web_search_call.action.sources"],
    });

    // Responses API 결과에서 텍스트 추출
    let reply = "";
    try {
      const first = response.output?.[0]?.content?.[0];
      if (first?.type === "output_text") {
        // SDK/버전별로 text가 string 또는 { value: string } 일 수 있음
        if (typeof first.text === "string") {
          reply = first.text;
        } else if (first.text && typeof first.text.value === "string") {
          reply = first.text.value;
        }
      }
    } catch {
      // ignore, 아래 fallback 사용
    }

    if (!reply) {
      return res.status(200).json({
        reply: {
          friendly_reply:
            "죄송해요, 답변을 생성하는 데 문제가 발생했어요. 조금 있다가 다시 시도해 주세요.",
          events: [],
          suggested_questions: [],
        },
      });
    }

    // 모델이 JSON 문자열로 준 답변을 파싱해서 프론트에서 일정한 형태로 쓰게 함
    try {
      const parsed = JSON.parse(reply);
      return res.status(200).json({ reply: parsed });
    } catch {
      return res.status(200).json({
        reply: {
          friendly_reply: reply,
          events: [],
          suggested_questions: [],
        },
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI chat failed" });
  }
};

