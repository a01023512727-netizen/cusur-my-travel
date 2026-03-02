class FestivalMap {
  constructor(mapContainerId) {
    this.containerId = mapContainerId;
    this.allFestivals = [];
    this.map = null;
    this.markers = [];

    // 날짜 선택 상태
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
        this.renderHighlights();
        this.renderNoImgList(this.allFestivals);
        this.initMap();
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
  openFlightPanel({ toCode, toCity, festName, startDate, endDate }) {
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

    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    sheet.setAttribute("aria-hidden", "false");
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
    const display = document.getElementById("flight-date-display");
    if (!display) return;

    if (start && end) display.innerText = `${this.formatKoreanDate(start)} - ${this.formatKoreanDate(end)} · 선택`;
    else if (start && !end) display.innerText = `${this.formatKoreanDate(start)} · 도착일 선택`;
    else display.innerText = `날짜 선택`;
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
  // Highlights (행복한 휴가)
  // =========================
  renderHighlights() {
    const container = document.getElementById('highlight-slider');
    if (!container) return;

    const highlights = this.allFestivals.filter(f => (f.isHighlight || "").toUpperCase() === "Y");
    const data = highlights.length ? highlights : this.allFestivals.slice(0, 8);

    container.innerHTML = data.map((f) => {
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
        endDate: f.endDate || ""
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
  // Map markers + detail
  // =========================
  renderMarkers() {
    this.allFestivals.forEach(fest => {
      if (fest.lat && fest.lng) {
        const marker = new google.maps.Marker({
          position: { lat: Number(fest.lat), lng: Number(fest.lng) },
          map: this.map,
          title: fest.name
        });
        marker.addListener('click', () => this.showDetail(fest));
        this.markers.push(marker);
      }
    });
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
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.scrollIntoView({ behavior: 'smooth' });
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
    document.getElementById('list-view').style.display = (view === 'list') ? 'block' : 'none';
    document.getElementById('detail-view').style.display = (view === 'detail') ? 'block' : 'none';
  }
}