class FestivalMap {
  constructor(mapContainerId) {
    this.containerId = mapContainerId;
    this.allFestivals = [];
    this.map = null;
    this.markers = [];
    this.selectedMapFestName = null;
    this.infoWindow = null;

    this.dpTempStart = "";
    this.dpTempEnd = "";
    this.dpMonthsToRender = 12;

    this.loadData();
  }

  async loadData() {
    try {
      const res = await fetch('/api/festivals');
      this.allFestivals = await res.json();

      if (this.allFestivals.length > 0) {
        this.renderUpcomingFestivals();
        this.renderHighlights();
        this.renderComingList();
        this.initMap();
        this.renderMapList();
        this.bindMapListReset();
        this.buildMapCountryFilter();
        this.bindMapCountryFilter();
      }
    } catch (err) {
      console.error("Data load error:", err);
    }
  }

  async initMap() {
    try {
      if (typeof google === 'undefined') return;
      this.map = new google.maps.Map(document.getElementById(this.containerId), {
        center: { lat: 36, lng: 138 },
        zoom: 5,
        disableDefaultUI: true,
        zoomControl: true
      });
      this.renderMarkers();
    } catch (err) {
      console.error("Map init error:", err);
    }
  }

  // =========================
  // Utils
  // =========================
  escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  getCountryFlagUrl(country) {
    if (!country || typeof country !== "string") return "";
    const name = country.trim().toLowerCase();
    const codeMap = {
      "대한민국": "kr", "한국": "kr", "korea": "kr", "일본": "jp", "japan": "jp",
      "미국": "us", "usa": "us", "united states": "us", "영국": "gb", "uk": "gb", "united kingdom": "gb",
      "프랑스": "fr", "france": "fr", "독일": "de", "germany": "de", "스페인": "es", "spain": "es",
      "이탈리아": "it", "italy": "it", "중국": "cn", "china": "cn", "호주": "au", "australia": "au",
      "브라질": "br", "brazil": "br", "멕시코": "mx", "mexico": "mx", "캐나다": "ca", "canada": "ca",
      "인도": "in", "india": "in", "태국": "th", "thailand": "th", "베트남": "vn", "vietnam": "vn",
      "인도네시아": "id", "indonesia": "id", "말레이시아": "my", "malaysia": "my",
      "네덜란드": "nl", "netherlands": "nl", "스위스": "ch", "switzerland": "ch",
      "오스트리아": "at", "austria": "at", "포르투갈": "pt", "portugal": "pt",
      "그리스": "gr", "greece": "gr", "터키": "tr", "turkey": "tr", "러시아": "ru", "russia": "ru",
    };
    const code = codeMap[name] || codeMap[country.trim()];
    return code ? `https://flagcdn.com/w160/${code}.png` : "";
  }

  clampText(str, max = 120) {
    const s = String(str ?? "").trim();
    if (!s) return "";
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  toIsoDate(s) {
    const str = String(s || "").trim();
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const m = str.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (!m) return "";
    const yyyy = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  formatKoreanDate(iso) {
    if (!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return `${m[1]}.${m[2]}.${m[3]}`;
  }

  formatKoreanDateWithDay(iso) {
    if (!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return `${m[1]}.${m[2]}.${m[3]}`;
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = days[d.getDay()];
    return `${m[1]}.${m[2]}.${m[3]}(${dayName})`;
  }

  compareIso(a, b) {
    if (!a || !b) return 0;
    return a.localeCompare(b);
  }

  addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  // =========================
  // Images (dummy)
  // =========================
  buildImageList(fest) {
    const arr = Array.isArray(fest.imageUrls) ? fest.imageUrls.filter(Boolean) : [];
    if (arr.length === 0 && fest.imageUrl) arr.push(fest.imageUrl);
    if (arr.length === 0) {
      arr.push("https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600");
    }
    const dummyPool = [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600",
      "https://images.unsplash.com/photo-1520975958225-17c211b193bf?auto=format&fit=crop&w=1600",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600"
    ];
    let i = 0;
    while (arr.length < 3) {
      const next = dummyPool[i % dummyPool.length];
      if (!arr.includes(next)) arr.push(next);
      i++;
      if (i > 10) break;
    }
    return arr.slice(0, 5);
  }

  // =========================
  // Flight panel
  // =========================
  openFlightPanel({ toCode, toCity, festName, startDate, endDate, imageUrl, label, country, locality, description, lat, lng }) {
    const sheet = document.getElementById("flight-sheet");
    const backdrop = document.getElementById("flight-backdrop");
    if (!sheet || !backdrop) return;

    const to = (toCode || "").trim().toUpperCase();
    document.getElementById("flight-from-code").innerText = "ICN";
    document.getElementById("flight-to-code").innerText = to || "---";
    document.getElementById("flight-to-city").innerText = toCity || festName || "도착지";

    const iso1 = this.toIsoDate(startDate);
    const iso2 = this.toIsoDate(endDate);

    const startHidden = document.getElementById("flight-date-start");
    const endHidden = document.getElementById("flight-date-end");
    if (startHidden && endHidden) {
      if (iso1) startHidden.value = iso1;
      if (iso2) endHidden.value = iso2;
      this.syncDateDisplayFromHidden();
    }
    this.updateFlightNightsLabel();
    this.updateFlightDynamicPrice();

    this.renderFlightFestivalHeader({
      festName: festName || "",
      label: label || "",
      country: country || "",
      locality: locality || "",
      startDate: startDate || "",
      endDate: endDate || "",
      description: description || ""
    });

    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    sheet.setAttribute("aria-hidden", "false");

    this.initFlightPanelMap(lat, lng, country);
  }

  initFlightPanelMap(lat, lng, country) {
    if (typeof google === "undefined") return;
    const mapEl = document.getElementById("flight-festival-map");
    if (!mapEl) return;

    if (this.flightPanelMap) {
      this.flightPanelMap = null;
    }
    if (this.flightPanelMarker) {
      this.flightPanelMarker = null;
    }

    let center;
    let zoom = 6;
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      center = { lat: Number(lat), lng: Number(lng) };
      zoom = 12;
    } else {
      const c = this.getCountryCenter(country || "");
      center = { lat: c.lat, lng: c.lng };
      zoom = c.zoom || 5;
    }

    this.flightPanelMap = new google.maps.Map(mapEl, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative"
    });

    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      this.flightPanelMarker = new google.maps.Marker({
        position: { lat: Number(lat), lng: Number(lng) },
        map: this.flightPanelMap
      });
    }
  }

  renderFlightFestivalHeader({ festName, label, country, locality, startDate, endDate, description }) {
    const header = document.getElementById("flight-festival-header");
    if (!header) return;

    const hasAny = festName || label || country || locality || startDate || endDate || description;
    if (!hasAny) {
      header.style.display = "none";
      return;
    }

    header.style.display = "block";

    const typeEl = document.getElementById("flight-festival-type");
    if (typeEl) {
      typeEl.textContent = label || "축제";
      typeEl.style.display = label ? "" : "none";
    }
    const countryEl = document.getElementById("flight-festival-country");
    if (countryEl) {
      countryEl.textContent = country || "";
      countryEl.style.display = country ? "" : "none";
    }
    const nameEl = document.getElementById("flight-festival-name");
    if (nameEl) nameEl.textContent = festName || "";

    const locEl = document.getElementById("flight-festival-location");
    if (locEl) locEl.textContent = locality ? `📍 ${locality}` : "";
    const dateEl = document.getElementById("flight-festival-date");
    if (dateEl) {
      const dateStr = [startDate, endDate].filter(Boolean).join(" ~ ") || "";
      dateEl.textContent = dateStr ? `📅 ${dateStr}` : "";
      dateEl.style.display = dateStr ? "" : "none";
    }
    const descEl = document.getElementById("flight-festival-desc");
    if (descEl) {
      descEl.textContent = description || "";
      descEl.style.display = description ? "" : "none";
    }
  }

  closeFlightPanel() {
    const sheet = document.getElementById("flight-sheet");
    const backdrop = document.getElementById("flight-backdrop");
    if (!sheet || !backdrop) return;

    backdrop.classList.remove("is-open");
    sheet.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    sheet.setAttribute("aria-hidden", "true");
  }

  // =========================
  // Date Picker (bottom sheet)
  // =========================
  openDatePicker() {
    const dateSheet = document.getElementById("date-sheet");
    const dateBackdrop = document.getElementById("date-backdrop");
    const body = document.getElementById("date-sheet-body");
    if (!dateSheet || !dateBackdrop || !body) return;

    const startHidden = document.getElementById("flight-date-start")?.value || "";
    const endHidden = document.getElementById("flight-date-end")?.value || "";
    this.dpTempStart = startHidden;
    this.dpTempEnd = endHidden;

    this.renderDatePickerCalendar();

    dateBackdrop.classList.add("is-open");
    dateSheet.classList.add("is-open");
    dateBackdrop.setAttribute("aria-hidden", "false");
    dateSheet.setAttribute("aria-hidden", "false");

    if (this.dpTempStart) {
      const key = this.dpTempStart.slice(0, 7);
      const target = body.querySelector(`[data-month="${key}"]`);
      if (target) target.scrollIntoView({ block: "start" });
    }
    this.syncDateConfirmText();
  }

  closeDatePicker() {
    const dateSheet = document.getElementById("date-sheet");
    const dateBackdrop = document.getElementById("date-backdrop");
    if (!dateSheet || !dateBackdrop) return;

    dateBackdrop.classList.remove("is-open");
    dateSheet.classList.remove("is-open");
    dateBackdrop.setAttribute("aria-hidden", "true");
    dateSheet.setAttribute("aria-hidden", "true");
  }

  confirmDatePicker() {
    const startHidden = document.getElementById("flight-date-start");
    const endHidden = document.getElementById("flight-date-end");
    if (startHidden && endHidden) {
      startHidden.value = this.dpTempStart || "";
      endHidden.value = this.dpTempEnd || "";
    }
    this.syncDateDisplayFromHidden();
    this.closeDatePicker();
  }

  syncDateDisplayFromHidden() {
    const start = document.getElementById("flight-date-start")?.value || "";
    const end = document.getElementById("flight-date-end")?.value || "";
    const departEl = document.getElementById("flight-depart-display");
    const returnEl = document.getElementById("flight-return-display");

    if (departEl) departEl.innerText = start ? this.formatKoreanDateWithDay(start) : "선택";
    if (returnEl) returnEl.innerText = end ? this.formatKoreanDateWithDay(end) : "선택";

    const quickBtns = document.querySelectorAll(".flight-quick-btn");
    if (start && end && quickBtns.length) {
      const startD = new Date(start + "T12:00:00");
      const endD = new Date(end + "T12:00:00");
      const nights = Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24));
      quickBtns.forEach((btn) => {
        const n = parseInt(btn.getAttribute("data-nights"), 10);
        btn.classList.toggle("active", n === nights);
      });
    } else {
      quickBtns.forEach((btn) => btn.classList.remove("active"));
    }

    this.updateFlightNightsLabel();
  }

  updateFlightNightsLabel() {
    const sheet = document.getElementById("flight-sheet");
    const startEl = document.getElementById("flight-date-start");
    const endEl = document.getElementById("flight-date-end");
    const valueEl = document.getElementById("flight-nights-value");
    if (!valueEl) return;

    const isRoundTrip = sheet?.getAttribute("data-round-trip") !== "false";
    const start = (startEl?.value || "").trim();
    const end = (endEl?.value || "").trim();

    if (!isRoundTrip) {
      valueEl.textContent = "편도 ";
      return;
    }
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
        if (diffDays >= 0) valueEl.textContent = `왕복 (${diffDays}박 ${diffDays + 1}일) `;
        else valueEl.textContent = "왕복 ";
      } else valueEl.textContent = "왕복 ";
    } else valueEl.textContent = "왕복 ";
    this.updateFlightDynamicPrice();
  }

  updateFlightDynamicPrice() {
    const sheet = document.getElementById("flight-sheet");
    const startEl = document.getElementById("flight-date-start");
    const endEl = document.getElementById("flight-date-end");
    const labelEl = document.getElementById("flight-dynamic-price-label");
    const amountEl = document.getElementById("flight-dynamic-price");
    if (!labelEl || !amountEl) return;

    const isRoundTrip = sheet?.getAttribute("data-round-trip") !== "false";
    const start = (startEl?.value || "").trim();
    const end = (endEl?.value || "").trim();

    if (!isRoundTrip) {
      labelEl.textContent = "예상 편도 최저가";
      amountEl.textContent = start ? "200,000원~" : "—";
      return;
    }
    if (!start) {
      labelEl.textContent = "예상 최저가";
      amountEl.textContent = "—";
      return;
    }
    if (!end) {
      labelEl.textContent = "예상 왕복 최저가";
      amountEl.textContent = "—";
      return;
    }
    const startDate = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      amountEl.textContent = "—";
      return;
    }
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) {
      amountEl.textContent = "—";
      return;
    }
    labelEl.textContent = `예상 왕복 (${diffDays}박 ${diffDays + 1}일) 최저가`;
    const base = 350000;
    const perNight = 25000;
    const amount = base + diffDays * perNight;
    amountEl.textContent = `${amount.toLocaleString()}원~`;
  }

  syncDateConfirmText() {
    const btn = document.getElementById("date-confirm");
    if (!btn) return;

    if (this.dpTempStart && this.dpTempEnd) btn.innerText = `${this.formatKoreanDate(this.dpTempStart)} - ${this.formatKoreanDate(this.dpTempEnd)} · 선택`;
    else if (this.dpTempStart && !this.dpTempEnd) btn.innerText = `${this.formatKoreanDate(this.dpTempStart)} · 도착일 선택`;
    else btn.innerText = `선택`;
  }

  renderDatePickerCalendar() {
    const body = document.getElementById("date-sheet-body");
    if (!body) return;

    const now = new Date();
    const months = [];
    for (let i = 0; i < this.dpMonthsToRender; i++) months.push(this.addMonths(now, i));

    const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

    body.innerHTML = months.map((m) => {
      const yyyy = m.getFullYear();
      const mm = m.getMonth() + 1;
      const monthKey = `${yyyy}-${String(mm).padStart(2, "0")}`;

      const firstDay = new Date(yyyy, mm - 1, 1);
      const startWeekday = firstDay.getDay();
      const lastDate = new Date(yyyy, mm, 0).getDate();

      const cells = [];
      for (let i = 0; i < startWeekday; i++) cells.push({ type: "empty" });

      for (let d = 1; d <= lastDate; d++) {
        const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const weekday = new Date(yyyy, mm - 1, d).getDay();
        cells.push({ type: "day", iso, d, weekday });
      }

      return `
        <div class="cal-month" data-month="${monthKey}">
          <div class="cal-month-title">${yyyy}년 ${mm}월</div>
          <div class="cal-weekdays">${weekdayLabels.map(w => `<div>${w}</div>`).join("")}</div>
          <div class="cal-grid">
            ${cells.map((c) => {
        if (c.type === "empty") return `<div class="cal-day is-muted" style="pointer-events:none;"></div>`;

        const isSun = c.weekday === 0;
        const isSat = c.weekday === 6;

        let cls = "cal-day";
        if (isSun) cls += " is-sun";
        if (isSat) cls += " is-sat";

        const s = this.dpTempStart;
        const e = this.dpTempEnd;

        let badge = "";
        let isSelected = false;

        if (s && c.iso === s) { isSelected = true; cls += " is-selected is-start"; badge = `data-badge="출발일"`; }
        if (e && c.iso === e) { isSelected = true; cls += " is-selected is-end"; badge = `data-badge="도착일"`; }

        if (!isSelected && s && e && this.compareIso(c.iso, s) > 0 && this.compareIso(c.iso, e) < 0) {
          cls += " is-in-range";
        }

        return `<div class="${cls}" ${badge} data-iso="${c.iso}">${c.d}</div>`;
      }).join("")}
          </div>
        </div>
      `;
    }).join("");

    body.querySelectorAll(".cal-day[data-iso]").forEach((el) => {
      el.addEventListener("click", () => {
        const iso = el.getAttribute("data-iso");
        this.handleDatePick(iso);
      });
    });
  }

  handleDatePick(iso) {
    if (!this.dpTempStart) {
      this.dpTempStart = iso;
      this.dpTempEnd = "";
    } else if (this.dpTempStart && !this.dpTempEnd) {
      if (this.compareIso(iso, this.dpTempStart) < 0) {
        this.dpTempEnd = this.dpTempStart;
        this.dpTempStart = iso;
      } else {
        this.dpTempEnd = iso;
      }
    } else {
      this.dpTempStart = iso;
      this.dpTempEnd = "";
    }

    this.renderDatePickerCalendar();
    this.syncDateConfirmText();
  }

  // =========================
  // 다가오는 축제 탐험 (계절별 필터 + 그리드)
  // =========================
  // 축제 startDate에서 월을 추출해 계절 반환 (봄 3~5월, 여름 6~8월, 가을 9~11월, 겨울 12~2월)
  getSeasonFromStartDate(startDate) {
    const s = String(startDate || "").trim();
    let month = 0;
    const iso = s.match(/(\d{4})[.\-/](\d{1,2})/);
    const slash = s.match(/^(\d{1,2})[.\-/]/);
    if (iso) month = parseInt(iso[2], 10);
    else if (slash) month = parseInt(slash[1], 10);
    if (!month || month < 1 || month > 12) return "";
    if (month >= 3 && month <= 5) return "봄";   // 3~5월
    if (month >= 6 && month <= 8) return "여름"; // 6~8월
    if (month >= 9 && month <= 11) return "가을"; // 9~11월
    if (month === 12 || month === 1 || month === 2) return "겨울"; // 12~2월
    return "";
  }

  renderUpcomingFestivals() {
    const gridEl = document.getElementById("upcoming-grid");
    const emptyEl = document.getElementById("upcoming-empty");
    const tabsEl = document.getElementById("upcoming-season-tabs");
    if (!gridEl || !emptyEl) return;

    let activeSeason = "전체";

    const filterBySeason = (list) => {
      if (activeSeason === "전체") return list;
      return list.filter((f) => this.getSeasonFromStartDate(f.startDate) === activeSeason);
    };

    const render = () => {
      const filtered = filterBySeason(this.allFestivals);

      if (filtered.length === 0) {
        gridEl.innerHTML = "";
        gridEl.style.display = "none";
        emptyEl.style.display = "block";
        return;
      }

      emptyEl.style.display = "none";
      gridEl.style.display = "grid";

      gridEl.innerHTML = filtered.map((f) => {
        const title = this.escapeHtml(f.name || "");
        const theme = this.escapeHtml(f.label || "축제");
        const season = this.getSeasonFromStartDate(f.startDate);
        const imgUrl = f.imageUrl || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600";
        const country = this.escapeHtml(f.country || "");
        const city = this.escapeHtml(f.locality || "");
        const desc = this.escapeHtml(this.clampText(f.description || "", 80));
        const dateText = [f.startDate, f.endDate].filter(Boolean).join(" ~ ") || "일정 정보 없음";
        const encodedName = encodeURIComponent(f.name || "");

        const seasonIcon = season === "봄" ? "🌸" : season === "여름" ? "☀️" : season === "가을" ? "🍁" : season === "겨울" ? "❄️" : "";

        return `
          <div class="upcoming-card" onclick="window.festivalMap.showDetailByName(decodeURIComponent('${encodedName}'))">
            <div class="upcoming-card-img-wrap">
              <img src="${this.escapeHtml(imgUrl)}" alt="${title}" class="upcoming-card-img" loading="lazy">
              <span class="upcoming-card-badge upcoming-card-badge-theme">${theme}</span>
              <span class="upcoming-card-badge upcoming-card-badge-season">${seasonIcon} ${season}</span>
            </div>
            <div class="upcoming-card-body">
              <div class="upcoming-card-location">📍 ${country}${country && city ? ", " : ""}${city || "위치 정보 없음"}</div>
              <h3 class="upcoming-card-title">${title}</h3>
              <p class="upcoming-card-desc">${desc}</p>
              <div class="upcoming-card-footer">
                <span class="upcoming-card-date">📅 ${this.escapeHtml(dateText)}</span>
                <span class="upcoming-card-link" aria-label="자세히 보기">→</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    };

    const setSeason = (season) => {
      activeSeason = season || "전체";
      if (tabsEl) {
        tabsEl.querySelectorAll(".upcoming-tab").forEach((b) => {
          b.classList.toggle("upcoming-tab-active", (b.getAttribute("data-season") || "전체") === activeSeason);
        });
      }
      const selectEl = document.getElementById("upcoming-season-select");
      if (selectEl) selectEl.value = activeSeason;
      render();
    };

    if (tabsEl) {
      tabsEl.querySelectorAll(".upcoming-tab").forEach((btn) => {
        btn.addEventListener("click", () => setSeason(btn.getAttribute("data-season") || "전체"));
      });
    }

    const selectEl = document.getElementById("upcoming-season-select");
    if (selectEl) {
      selectEl.addEventListener("change", () => setSeason(selectEl.value || "전체"));
    }

    const resetBtn = document.getElementById("upcoming-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => setSeason("전체"));
    }

    render();
  }

  // =========================
  // Highlights (행복한 휴가)
  // =========================
  renderHighlights() {
    const container = document.getElementById('highlight-slider');
    if (!container) return;

    const highlights = this.allFestivals.filter(f => (f.isHighlight || "").toUpperCase() === "Y");

    if (!highlights.length) {
      container.innerHTML = '<p class="highlights-empty">행복한 휴가로 지정된 항목이 없습니다. (omaturi 시트 N열에 Y 또는 체크)</p>';
      return;
    }

    container.innerHTML = highlights.map((f) => {
      const name = this.escapeHtml(f.name);
      const country = this.escapeHtml(f.country || "");
      const dateText = this.escapeHtml(`${f.startDate || ""} ~ ${f.endDate || ""}`.trim());
      const address = this.escapeHtml(f.address || "");
      const locality = this.escapeHtml(f.locality || "");
      const desc = this.escapeHtml(this.clampText(f.description || "", 110));

      const airport = this.escapeHtml((f.airport || "").toUpperCase());          // sheet B
      const attendanceNum = Number(f.attendance || 0);                           // sheet L
      const attendanceText = attendanceNum ? attendanceNum.toLocaleString() : "정보 없음";

      const encodedName = encodeURIComponent(f.name || "");
      const images = this.buildImageList(f);

      const openArgs = encodeURIComponent(JSON.stringify({
        toCode: (f.airport || "").toUpperCase(),
        toCity: f.country || "",
        festName: f.name || "",
        startDate: f.startDate || "",
        endDate: f.endDate || "",
        imageUrl: (f.imageUrl || "").trim() || "",
        label: (f.label || "").trim() || "",
        country: (f.country || "").trim() || "",
        locality: (f.locality || "").trim() || "",
        description: (f.description || "").trim() || "",
        lat: f.lat != null ? Number(f.lat) : null,
        lng: f.lng != null ? Number(f.lng) : null
      }));

      const btnDisabled = airport ? "" : "disabled";

      return `
        <div class="dark-card">
          <div class="dark-card-inner">

            <!-- ✅ 이미지(모바일에서는 텍스트 아래로 내려감: CSS가 column-reverse 처리) -->
            <div class="dark-media">
              <div class="dark-card-carousel" aria-label="festival images">
                ${images.map((url, idx) => {
        const safeUrl = this.escapeHtml(url);
        return `
                    <div class="carousel-item" onclick="window.festivalMap.showDetailByName(decodeURIComponent('${encodedName}'))">
                      <img src="${safeUrl}" alt="${name} image ${idx + 1}">
                    </div>
                  `;
      }).join('')}
              </div>

              <!-- ✅ 모바일에서만 버튼이 사진 아래에 나오도록 -->
              <button
                class="flight-cta-btn mobile-only"
                ${btnDisabled}
                onclick="event.stopPropagation(); window.festivalMap.openFlightPanel(JSON.parse(decodeURIComponent('${openArgs}')));"
                title="${airport ? "" : "공항코드(도착지)가 없어 버튼이 비활성화됩니다."}"
              >
                항공권 알아보기
              </button>
            </div>

            <!-- ✅ 텍스트 -->
            <div class="dark-text">
              <div class="dark-card-header" onclick="window.festivalMap.showDetailByName(decodeURIComponent('${encodedName}'))">
                <div class="dark-card-dot"></div>

                <div class="dark-card-headings" style="min-width:0;">
                  <div class="dark-card-kicker">${country ? country : "GLOBAL FESTIVAL"}</div>
                  <div class="dark-card-title">${name}</div>
                  <div class="dark-card-desc">${desc || ""}</div>
                  <a class="dark-card-link" href="javascript:void(0)">더 알아보기</a>

                  <!-- ✅ 일정/주소/도착공항/예상참여인원: 설명 아래쪽 -->
                  <div class="dark-card-meta-intext">
                    <div class="meta-row">📅 <strong>일정</strong> <span>${dateText || "정보 없음"}</span></div>
                    <div class="meta-row">📍 <strong>주소</strong> <span>${locality}${locality && address ? " · " : ""}${address}</span></div>
                    <div class="meta-row">✈️ <strong>도착 공항</strong> <span>${airport || "정보 없음"}</span></div>
                    <div class="meta-row">👥 <strong>예상 참여 인원</strong> <span>${attendanceText}</span></div>

                    <!-- ✅ PC에서만: 주소 아래쪽에 버튼 (이미지 끝과 버튼 끝 하단 정렬은 CSS에서 처리됨) -->
                    <button
                      class="flight-cta-btn pc-only"
                      ${btnDisabled}
                      onclick="event.stopPropagation(); window.festivalMap.openFlightPanel(JSON.parse(decodeURIComponent('${openArgs}')));"
                      title="${airport ? "" : "공항코드(도착지)가 없어 버튼이 비활성화됩니다."}"
                    >
                      항공권 알아보기
                    </button>
                  </div>
                </div>

                <button class="dark-card-chevron" aria-label="open">⌃</button>
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');
  }

  // =========================
  // 다가오는 축제 (리스트형)
  // =========================
  renderComingList() {
    const container = document.getElementById("coming-list");
    if (!container) return;

    const list = this.allFestivals;
    const arrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

    container.innerHTML = list.map((f, idx) => {
      const theme = this.escapeHtml((f.label || "").trim()) || "";
      const title = this.escapeHtml(f.name || "");
      const desc = this.escapeHtml((f.description || "").trim());
      const country = this.escapeHtml(f.country || "");
      const dateStr = (f.startDate || "").split(" ")[0] || (f.startDate || "") || "";
      const imgUrl = (f.imageUrl || "").trim();
      const encodedName = encodeURIComponent(f.name || "");

      const thumbBlock = imgUrl
        ? `<div class="coming-list-thumb"><img src="${this.escapeHtml(imgUrl)}" alt="${title}" loading="lazy"></div>`
        : "";

      return `
        <div class="coming-list-item" onclick="window.festivalMap.showComingDetail(decodeURIComponent('${encodedName}'))">
          <div class="coming-list-left">
            ${thumbBlock}
            <div class="coming-list-meta">
              ${theme ? `<span class="coming-list-theme">${theme}</span>` : ""}
              <h4 class="coming-list-name">${title}</h4>
            </div>
          </div>
          <div class="coming-list-desc">${desc || "—"}</div>
          <div class="coming-list-right">
            <div>
              <p class="coming-list-loc">📍 ${country || "—"}</p>
              <p class="coming-list-date">${this.escapeHtml(dateStr)}</p>
            </div>
            <div class="coming-list-arrow">${arrowSvg}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  showComingDetail(name) {
    const fest = this.allFestivals.find((f) => f.name === name);
    if (!fest) return;
    this.showDetail(fest);
    const detailView = document.getElementById("detail-view");
    if (detailView) detailView.scrollIntoView({ behavior: "smooth" });
  }

  // =========================
  // No-image list (지도 아래)
  // =========================
  renderNoImgList(data) {
    const listContainer = document.getElementById('festival-list-no-img');
    if (!listContainer) return;

    listContainer.innerHTML = data.map(f => {
      const name = this.escapeHtml(f.name);
      const label = this.escapeHtml(f.label || "FESTIVAL");
      const country = this.escapeHtml(f.country || "");
      const locality = this.escapeHtml(f.locality || "");
      const address = this.escapeHtml(f.address || "");
      const dateText = this.escapeHtml(`${f.startDate || ""} ~ ${f.endDate || ""}`.trim());
      const preview = this.escapeHtml(this.clampText(f.description || "", 90));
      const encodedName = encodeURIComponent(f.name || "");

      return `
        <div class="ios-card" onclick="window.festivalMap.focusOnMap(${Number(f.lat) || 0}, ${Number(f.lng) || 0}, decodeURIComponent('${encodedName}'))">
          <span class="ios-badge">${label}</span>
          <h4>${name}</h4>
          <div class="ios-author">${country ? country : "국가 정보 없음"}</div>
          <div class="ios-info">📍 ${locality}${locality && address ? " · " : ""}${address}</div>
          <div class="ios-info">📅 ${dateText || "일정 정보 없음"}</div>
          ${preview ? `<div class="ios-info ios-desc">${preview}</div>` : ""}
          <div class="ios-card-footer">더 알아보기 →</div>
        </div>
      `;
    }).join('');
  }

  // =========================
  // Map markers (커스텀 핀 + 호버 툴팁 + 선택)
  // =========================
  getPinIconUrl(fillHex, size = 24) {
    const s = size;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${s}" height="${s * 1.5}"><path fill="${fillHex}" stroke="#fff" stroke-width="1.5" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"/><circle fill="#fff" cx="12" cy="12" r="5"/></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  renderMarkers() {
    if (!this.map) return;
    const roseUrl = this.getPinIconUrl("#f43f5e", 24);
    const indigoUrl = this.getPinIconUrl("#4f46e5", 32);

    this.allFestivals.forEach(fest => {
      if (!fest.lat || !fest.lng) return;
      const isSelected = this.selectedMapFestName === fest.name;
      const marker = new google.maps.Marker({
        position: { lat: Number(fest.lat), lng: Number(fest.lng) },
        map: this.map,
        icon: { url: isSelected ? indigoUrl : roseUrl, scaledSize: new google.maps.Size(isSelected ? 32 : 24, isSelected ? 48 : 36), anchor: new google.maps.Point(isSelected ? 16 : 12, isSelected ? 48 : 36) },
        title: fest.name,
        zIndex: isSelected ? 100 : 10
      });
      marker.fest = fest;

      marker.addListener("click", () => {
        this.selectedMapFestName = this.selectedMapFestName === fest.name ? null : fest.name;
        this.updateMarkerIcons();
        this.renderMapList();
        this.updateMapListHeader();
      });

      marker.addListener("mouseover", () => {
        this.showPinTooltip(marker, fest.name);
      });
      marker.addListener("mouseout", () => {
        this.hidePinTooltip();
      });

      this.markers.push(marker);
    });
  }

  showPinTooltip(marker, text) {
    if (!this.map) return;
    if (!this.infoWindow) this.infoWindow = new google.maps.InfoWindow();
    const safe = this.escapeHtml(text);
    this.infoWindow.setContent("<div style=\"padding:6px 12px;background:#111;color:#fff;font-size:12px;font-weight:500;border-radius:8px;white-space:nowrap\">" + safe + "</div>");
    this.infoWindow.open(this.map, marker);
  }

  hidePinTooltip() {
    if (this.infoWindow) this.infoWindow.close();
  }

  updateMarkerIcons() {
    const roseUrl = this.getPinIconUrl("#f43f5e", 24);
    const indigoUrl = this.getPinIconUrl("#4f46e5", 32);
    this.markers.forEach((marker) => {
      if (!marker.fest) return;
      const isSelected = this.selectedMapFestName === marker.fest.name;
      marker.setIcon({ url: isSelected ? indigoUrl : roseUrl, scaledSize: new google.maps.Size(isSelected ? 32 : 24, isSelected ? 48 : 36), anchor: new google.maps.Point(isSelected ? 16 : 12, isSelected ? 48 : 36) });
      marker.setZIndex(isSelected ? 100 : 10);
    });
  }

  renderMapList() {
    const container = document.getElementById("map-festival-list");
    if (!container) return;
    const list = this.selectedMapFestName
      ? this.allFestivals.filter((f) => f.name === this.selectedMapFestName)
      : this.allFestivals;

    container.innerHTML = list.map((f) => {
      const name = this.escapeHtml(f.name || "");
      const country = this.escapeHtml(f.country || "");
      const city = this.escapeHtml(f.locality || "");
      const dateStr = (f.startDate || "").split(" ")[0] || (f.startDate || "");
      const imgUrl = (f.imageUrl || "").trim() || "";
      const flagUrl = this.getCountryFlagUrl(f.country || "");
      const encodedName = encodeURIComponent(f.name || "");

      let thumbHtml;
      if (imgUrl) {
        thumbHtml = `<img src="${this.escapeHtml(imgUrl)}" alt="${name}" loading="lazy">`;
      } else if (flagUrl) {
        thumbHtml = `<img src="${this.escapeHtml(flagUrl)}" alt="${country}" class="map-list-item-flag" loading="lazy">`;
      } else {
        thumbHtml = '<div class="map-list-item-placeholder">🌐</div>';
      }

      return `
        <div class="map-list-item" onclick="window.festivalMap.selectMapFestival(decodeURIComponent('${encodedName}'))">
          <div class="map-list-item-thumb">
            ${thumbHtml}
          </div>
          <div class="map-list-item-info">
            <h4 class="map-list-item-title">${name}</h4>
            <p class="map-list-item-meta">📍 ${country}${country && city ? ", " : ""}${city || ""}</p>
            <p class="map-list-item-date">${this.escapeHtml(dateStr)}</p>
          </div>
          <span class="map-list-item-arrow" aria-label="자세히 보기">→</span>
        </div>
      `;
    }).join("");
  }

  updateMapListHeader() {
    const resetBtn = document.getElementById("map-reset-btn");
    if (resetBtn) resetBtn.style.display = this.selectedMapFestName ? "block" : "none";
  }

  bindMapListReset() {
    const btn = document.getElementById("map-reset-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      this.selectedMapFestName = null;
      this.updateMarkerIcons();
      this.renderMapList();
      this.updateMapListHeader();
    });
  }

  buildMapCountryFilter() {
    const select = document.getElementById("map-country-select");
    if (!select) return;
    const countries = [...new Set(this.allFestivals.map((f) => (f.country || "").trim()).filter(Boolean))].sort();
    select.innerHTML = '<option value="">전체</option>' + countries.map((c) => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`).join("");
  }

  bindMapCountryFilter() {
    const select = document.getElementById("map-country-select");
    if (!select || !this.map) return;
    select.addEventListener("change", () => {
      const country = (select.value || "").trim();
      const inCountry = country ? this.allFestivals.filter((f) => (f.country || "").trim() === country) : this.allFestivals;
      const withPos = inCountry.filter((f) => f.lat && f.lng);

      if (withPos.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        withPos.forEach((f) => bounds.extend({ lat: Number(f.lat), lng: Number(f.lng) }));
        this.map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
        const zoom = this.map.getZoom();
        if (zoom > 10) this.map.setZoom(10);
      } else if (country) {
        const center = this.getCountryCenter(country);
        this.map.setCenter(center);
        this.map.setZoom(center.zoom || 5);
      } else {
        this.map.setCenter({ lat: 36, lng: 138 });
        this.map.setZoom(5);
      }
    });
  }

  getCountryCenter(countryName) {
    const name = (countryName || "").trim().toLowerCase();
    const centers = {
      korea: { lat: 36, lng: 128, zoom: 5 },
      "대한민국": { lat: 36, lng: 128, zoom: 5 },
      "한국": { lat: 36, lng: 128, zoom: 5 },
      japan: { lat: 36, lng: 138, zoom: 5 },
      "일본": { lat: 36, lng: 138, zoom: 5 },
      usa: { lat: 39, lng: -98, zoom: 4 },
      "미국": { lat: 39, lng: -98, zoom: 4 },
      "united states": { lat: 39, lng: -98, zoom: 4 },
      uk: { lat: 55, lng: -3, zoom: 5 },
      "영국": { lat: 55, lng: -3, zoom: 5 },
      france: { lat: 46, lng: 2, zoom: 5 },
      "프랑스": { lat: 46, lng: 2, zoom: 5 },
      germany: { lat: 51, lng: 10, zoom: 5 },
      "독일": { lat: 51, lng: 10, zoom: 5 },
      spain: { lat: 40, lng: -4, zoom: 5 },
      "스페인": { lat: 40, lng: -4, zoom: 5 },
      italy: { lat: 42, lng: 12, zoom: 5 },
      "이탈리아": { lat: 42, lng: 12, zoom: 5 },
      china: { lat: 35, lng: 105, zoom: 4 },
      "중국": { lat: 35, lng: 105, zoom: 4 },
      australia: { lat: -25, lng: 133, zoom: 4 },
      "호주": { lat: -25, lng: 133, zoom: 4 },
      brazil: { lat: -14, lng: -51, zoom: 4 },
      "브라질": { lat: -14, lng: -51, zoom: 4 },
      mexico: { lat: 23, lng: -102, zoom: 4 },
      "멕시코": { lat: 23, lng: -102, zoom: 4 },
      canada: { lat: 56, lng: -106, zoom: 4 },
      "캐나다": { lat: 56, lng: -106, zoom: 4 },
      india: { lat: 20, lng: 77, zoom: 4 },
      "인도": { lat: 20, lng: 77, zoom: 4 },
    };
    return centers[name] || { lat: 20, lng: 0, zoom: 2 };
  }

  selectMapFestival(name) {
    const fest = this.allFestivals.find((f) => f.name === name);
    if (!fest) return;
    this.selectedMapFestName = name;
    this.updateMarkerIcons();
    this.renderMapList();
    this.updateMapListHeader();
    if (this.map && fest.lat && fest.lng) {
      this.map.setCenter({ lat: Number(fest.lat), lng: Number(fest.lng) });
      this.map.setZoom(12);
    }
  }

  focusOnMap(lat, lng, name) {
    const pos = { lat: Number(lat), lng: Number(lng) };
    if (this.map) {
      this.map.setCenter(pos);
      this.map.setZoom(12);
    }
    const target = this.allFestivals.find(f => f.name === name);
    if (target) this.showDetail(target);
  }

  showDetailByName(name) {
    const target = this.allFestivals.find(f => f.name === name);
    if (target) {
      this.showDetail(target);
      const detailView = document.getElementById("detail-view");
      if (detailView) detailView.scrollIntoView({ behavior: "smooth" });
    }
  }

  showDetail(fest) {
    document.getElementById('detail-name').innerText = fest.name;
    document.getElementById('detail-date').innerText = `일시: ${fest.startDate} ~ ${fest.endDate}`;
    document.getElementById('detail-desc').innerText = fest.description;

    const detailView = document.getElementById('detail-view');
    let infoSection = document.getElementById('detail-info-extra');

    if (!infoSection) {
      infoSection = document.createElement('div');
      infoSection.id = 'detail-info-extra';
      infoSection.style.cssText = "margin-top:20px; border-top:1px solid #eee; padding-top:20px; font-size:0.9rem; color:#666;";
      detailView.appendChild(infoSection);
    }

    infoSection.innerHTML = `
      <p>📍 <strong>위치:</strong> ${fest.locality} (${fest.address})</p>
      <p>👥 <strong>예상 관객수:</strong> ${Number(fest.attendance || 0).toLocaleString()}명</p>
      <p>🏷️ <strong>카테고리:</strong> ${fest.label || ""}</p>
      <p>🌐 <strong>국가:</strong> ${fest.country || ""}</p>
    `;

    const detailImg = document.getElementById('detail-image');
    if (fest.imageUrl) {
      detailImg.src = fest.imageUrl;
      detailImg.style.display = 'block';
    } else {
      detailImg.style.display = 'none';
    }

    this.toggleView('detail');
  }

  toggleView(view) {
    const splitWrap = document.getElementById("map-split-wrap");
    const detailView = document.getElementById("detail-view");
    if (splitWrap) splitWrap.style.display = (view === "list") ? "grid" : "none";
    if (detailView) detailView.style.display = (view === "detail") ? "block" : "none";
  }
}