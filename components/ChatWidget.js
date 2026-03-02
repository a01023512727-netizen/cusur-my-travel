class AiChatWidget {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.lastQuestion = null;
    this.lastAnswer = null;
    this.setupDom();
    this.bindEvents();
  }

  setupDom() {
    this.fab = document.getElementById("ai-chat-fab");
    this.panel = document.getElementById("ai-chat-panel");
    this.backdrop = document.getElementById("ai-chat-backdrop");
    this.closeBtn = document.getElementById("ai-chat-close");
    this.resetBtn = document.getElementById("ai-chat-reset");
    this.messagesEl = document.getElementById("ai-chat-messages");
    this.recoEl = document.getElementById("ai-chat-reco");
    this.form = document.getElementById("ai-chat-form");
    this.input = document.getElementById("ai-chat-input");
  }

  bindEvents() {
    if (this.fab) {
      this.fab.addEventListener("click", () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.reset());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => this.close());
    }
    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  reset() {
    this.lastQuestion = null;
    this.lastAnswer = null;
    if (this.messagesEl) {
      this.messagesEl.innerHTML = "";
    }
  }

  open() {
    this.isOpen = true;
    this.panel?.classList.add("is-open");
    this.backdrop?.classList.add("is-open");
    this.panel?.setAttribute("aria-hidden", "false");
    this.backdrop?.setAttribute("aria-hidden", "false");
  }

  close() {
    this.isOpen = false;
    this.panel?.classList.remove("is-open");
    this.backdrop?.classList.remove("is-open");
    this.panel?.setAttribute("aria-hidden", "true");
    this.backdrop?.setAttribute("aria-hidden", "true");
  }

  appendMessage({ role, text }) {
    if (!this.messagesEl) return;
    const item = document.createElement("div");
    item.className =
      "ai-chat-message " + (role === "user" ? "ai-chat-message-user" : "ai-chat-message-assistant");

    const bubble = document.createElement("div");
    bubble.className = "ai-chat-bubble";
    bubble.innerText = text;

    item.appendChild(bubble);
    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  appendRichAssistantMessage(payload) {
    if (!this.messagesEl) return;

    const data = payload && typeof payload === "object" ? payload : {};
    const friendly = String(data.friendly_reply || "").trim();
    const events = Array.isArray(data.events) ? data.events : [];
    const questions = Array.isArray(data.suggested_questions) ? data.suggested_questions : [];

    const item = document.createElement("div");
    item.className = "ai-chat-message ai-chat-message-assistant";

    const bubble = document.createElement("div");
    bubble.className = "ai-chat-bubble";

    if (friendly) {
      const p = document.createElement("div");
      p.className = "ai-chat-friendly";
      p.innerText = friendly;
      bubble.appendChild(p);
    }

    if (events.length && this.recoEl) {
      this.recoEl.innerHTML = "";

      const title = document.createElement("div");
      title.className = "ai-chat-section-title ai-chat-section-title-reco";
      title.innerText = "추천 일정";
      this.recoEl.appendChild(title);

      const rail = document.createElement("div");
      rail.className = "ai-chat-rail";

      events.forEach((it) => {
        const card = document.createElement("div");
        card.className = "ai-chat-card";

        const name = document.createElement("div");
        name.className = "ai-chat-card-title";
        name.innerText = it?.name || "이벤트";
        card.appendChild(name);

        const meta = document.createElement("div");
        meta.className = "ai-chat-card-meta";
        meta.innerText = `${it?.location || ""}${it?.period ? ` · ${it.period}` : ""}`.trim();
        card.appendChild(meta);

        if (it?.description) {
          const desc = document.createElement("div");
          desc.className = "ai-chat-card-desc";
          desc.innerText = it.description;
          card.appendChild(desc);
        }

        const cta = document.createElement("button");
        cta.type = "button";
        cta.className = "ai-chat-card-cta";
        cta.innerText = "항공권 알아보기";
        cta.addEventListener("click", () => this.openFlightFromEvent(it));
        card.appendChild(cta);

        rail.appendChild(card);
      });

      this.recoEl.appendChild(rail);
    }

    if (questions.length) {
      const title = document.createElement("div");
      title.className = "ai-chat-section-title";
      title.innerText = "이어서 물어보기";
      bubble.appendChild(title);

      const chips = document.createElement("div");
      chips.className = "ai-chat-chips";
      questions.slice(0, 6).forEach((q) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ai-chat-chip";
        btn.innerText = q;
        btn.addEventListener("click", () => {
          if (!this.input) return;
          this.input.value = q;
          this.input.focus();
        });
        chips.appendChild(btn);
      });
      bubble.appendChild(chips);
    }

    item.appendChild(bubble);
    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  appendTyping() {
    if (!this.messagesEl) return;
    const item = document.createElement("div");
    item.className = "ai-chat-message ai-chat-message-assistant";
    item.id = "ai-chat-typing";
    item.innerHTML = '<div class="ai-chat-bubble ai-chat-typing-bubble"><span></span><span></span><span></span></div>';
    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  removeTyping() {
    const el = document.getElementById("ai-chat-typing");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  async handleSubmit() {
    const value = this.input?.value?.trim();
    if (!value) return;

    const currentQuestion = value;

    this.appendMessage({ role: "user", text: value });
    this.input.value = "";

    this.appendTyping();

    try {
      const body = {
        message: currentQuestion,
      };
      if (this.lastQuestion && this.lastAnswer) {
        body.previous = {
          question: this.lastQuestion,
          answer: this.lastAnswer,
        };
      }

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      this.removeTyping();

      if (!res.ok || !data || !data.reply) {
        this.appendMessage({
          role: "assistant",
          text: "죄송해요, 현재 AI 서버와 통신에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }

      if (data.reply && typeof data.reply === "object") {
        this.appendRichAssistantMessage(data.reply);
        this.lastQuestion = currentQuestion;
        this.lastAnswer = data.reply;
      } else {
        const text = String(data.reply || "");
        this.appendMessage({ role: "assistant", text });
        this.lastQuestion = currentQuestion;
        this.lastAnswer = { friendly_reply: text, events: [], suggested_questions: [] };
      }
    } catch (err) {
      console.error(err);
      this.removeTyping();
      this.appendMessage({
        role: "assistant",
        text: "네트워크 오류가 발생했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
      });
    }
  }

  openFlightFromEvent(event) {
    try {
      if (!window.festivalMap || typeof window.festivalMap.openFlightPanel !== "function") return;

      const code = String(event?.recommended_airport || "").trim().toUpperCase();
      const location = String(event?.location || "").trim();
      const period = String(event?.period || "").trim();

      const dates = this.parsePeriod(period);

      window.festivalMap.openFlightPanel({
        toCode: code,
        toCity: location || event?.name || "",
        festName: event?.name || "",
        startDate: dates.startIso,
        endDate: dates.endIso,
      });
    } catch (e) {
      console.error(e);
    }
  }

  parsePeriod(period) {
    const empty = { startIso: "", endIso: "" };
    if (!period) return empty;
    const matches = period.match(/(\d{4}-\d{2}-\d{2})/g);
    if (!matches || !matches.length) return empty;
    const startIso = matches[0];
    const endIso = matches[1] || "";
    return { startIso, endIso };
  }
}

window.addEventListener("load", () => {
  window.aiChatWidget = new AiChatWidget();
});

