const CHECKLIST = [
  {
    title: { ru: "На этой неделе", en: "This week", tg: "Ин ҳафта" },
    items: [
      { id: "w1", label: { ru: "Записаться на IELTS Academic", en: "Book IELTS Academic", tg: "Ба IELTS Academic сабт шавед" } },
      { id: "w2", label: { ru: "Создать аккаунт CSCA (csca.cn)", en: "Create CSCA account", tg: "Аккаунти CSCA созед" } },
      { id: "w3", label: { ru: "Проверить срок паспорта", en: "Check passport validity", tg: "Мӯҳлати шиносномаро санҷед" } },
      { id: "w4", label: { ru: "Выбрать 6 вузов", en: "Shortlist 6 universities", tg: "6 донишгоҳро интихоб кунед" } },
    ],
  },
  {
    title: { ru: "Документы", en: "Documents", tg: "Ҳуҷҷатҳо" },
    items: [
      { id: "d1", label: { ru: "Скан паспорта", en: "Passport scan", tg: "Скани шиноснома" } },
      { id: "d2", label: { ru: "Аттестат / справка", en: "Diploma / leaving cert", tg: "Аттестат / маълумотнома" } },
      { id: "d3", label: { ru: "Транскрипт + перевод EN", en: "Transcript + EN translation", tg: "Транскрипт + тарҷумаи EN" } },
      { id: "d4", label: { ru: "Справка о несудимости", en: "No-criminal record", tg: "Маълумотнома аз судият" } },
      { id: "d5", label: { ru: "Медсправка", en: "Medical form", tg: "Маълумотномаи тиббӣ" } },
      { id: "d6", label: { ru: "1–2 рекомендации", en: "1–2 recommendations", tg: "1–2 тавсиянома" } },
    ],
  },
  {
    title: { ru: "Подача", en: "Applications", tg: "Пешниҳод" },
    items: [
      { id: "s1", label: { ru: "Подать в 2–3 вуза мечты", en: "Apply to 2–3 dream unis", tg: "Ба 2–3 донишгоҳи орзу" } },
      { id: "s2", label: { ru: "Подать в бюджетные / реализм", en: "Apply to realistic / budget", tg: "Ба буҷетӣ / воқеӣ" } },
      { id: "s3", label: { ru: "CSC Type A (посольство)", en: "CSC Type A (embassy)", tg: "CSC Type A (сафоратхона)" } },
      { id: "s4", label: { ru: "CSCA transcript во все заявки", en: "CSCA in all apps", tg: "CSCA ба ҳамаи дархостҳо" } },
      { id: "s5", label: { ru: "Offer → JW202 → виза X1", en: "Offer → JW202 → X1 visa", tg: "Offer → JW202 → визаи X1" } },
    ],
  },
];

const I18N = () => window.BRIDGE_I18N;
const Auth = () => window.BRIDGE_AUTH;
const FX = () => window.BRIDGE_FX;

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function moneyTriple(cny) {
  return FX().format(cny).label;
}

function yearBudget(u) {
  return (u.tuitionYear || 0) + (u.dormYear || 0) + (u.insuranceYear || 0) + (u.livingMonth || 0) * 10 + (u.applicationFee || 0);
}

function trPhrase(raw) {
  return window.BRIDGE_PHRASE_UTILS?.tr(raw) ?? String(raw ?? "");
}

function tierLabel(tier) {
  const t = I18N();
  if (tier === "dream") return t.t("tier_dream");
  if (tier === "real") return t.t("tier_real");
  if (tier === "budget") return t.t("tier_budget");
  return tier;
}

function formatCover(v) {
  const t = I18N();
  if (v === true) return t.t("yes");
  if (v === false) return t.t("no");
  if (v == null) return "—";
  const s = String(v).toLowerCase();
  if (s.includes("partial")) return t.t("partial");
  return trPhrase(v) !== String(v) ? trPhrase(v) : String(v);
}

/** Merge fees-live.json (from parse-tuition.mjs) onto BRIDGE_UNIS */
async function loadLiveFees() {
  try {
    const res = await fetch("fees-live.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const fees = data.fees || {};
    (window.BRIDGE_UNIS || []).forEach((u) => {
      const hit = fees[u.id];
      if (!hit || !hit.tuitionYear) return;
      const catalog = u.tuitionYear;
      const ratio = hit.tuitionYear / (catalog || hit.tuitionYear);
      // Safety: ignore parser outliers vs catalog
      if (ratio < 0.45 || ratio > 2.2) return;
      u.tuitionYear = hit.tuitionYear;
      u.feeLive = hit;
      if (u.quota && typeof u.quota.saveVsPaidYear === "number") {
        u.quota.saveVsPaidYear =
          (hit.tuitionYear || 0) + (u.dormYear || 0) + (u.quota.stipendMonth || 0) * 10;
      }
    });
    window.BRIDGE_FEES_META = data;
  } catch {
    /* static host / first run without parser output */
  }
}

/* ---------- i18n apply ---------- */
function applyI18n() {
  const t = I18N();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t.t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = val;
    else el.textContent = val;
  });
  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === t.lang);
  });
  document.title =
    t.lang === "en"
      ? "BRIDGE — Orientation & China universities"
      : t.lang === "tg"
        ? "BRIDGE — Ориентатсия ва донишгоҳҳои Чин"
        : "BRIDGE — Ориентация и вузы Китая";
}

function setupLang() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      I18N().setLang(btn.dataset.lang);
      applyI18n();
      route();
    });
  });
  window.addEventListener("bridge:lang", () => {
    applyI18n();
  });
  applyI18n();
}

/* ---------- Auth gate ---------- */
function showGate(mode) {
  const gate = document.getElementById("authGate");
  const shell = document.getElementById("appShell");
  gate.hidden = false;
  shell.classList.add("gated");
  const reg = document.getElementById("gateRegister");
  const login = document.getElementById("gateLogin");
  const otp = document.getElementById("gateOtp");
  if (mode === "otp") {
    reg.hidden = true;
    login.hidden = true;
    otp.hidden = false;
  } else if (mode === "login") {
    reg.hidden = true;
    login.hidden = false;
    otp.hidden = true;
  } else {
    reg.hidden = false;
    login.hidden = true;
    otp.hidden = true;
  }
}

function hideGate() {
  document.getElementById("authGate").hidden = true;
  document.getElementById("appShell").classList.remove("gated");
}

function refreshUserUI() {
  const user = Auth().currentUser();
  const pill = document.getElementById("userPill");
  const btn = document.getElementById("navAuthBtn");
  if (user) {
    pill.hidden = false;
    pill.textContent = user.name;
    btn.textContent = I18N().t("nav_logout");
    btn.onclick = () => {
      Auth().logout(false);
      enforceGate();
    };
  } else {
    pill.hidden = true;
  }
}

function enforceGate() {
  if (Auth().isAuthed()) {
    hideGate();
    refreshUserUI();
    route();
  } else {
    const users = Auth().getUsers();
    const hasUsers = Object.keys(users).length > 0;
    showGate(hasUsers ? "login" : "register");
    refreshUserUI();
  }
}

function setupAuthUI() {
  document.getElementById("toLogin").addEventListener("click", () => showGate("login"));
  document.getElementById("toRegister").addEventListener("click", () => showGate("register"));

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById("gateMsg");
    msg.textContent = "";
    try {
      const pending = await Auth().requestOtp({
        mode: "register",
        name: String(fd.get("name")).trim(),
        email: String(fd.get("email")),
        country: fd.get("country"),
        consents: {
          pd: !!fd.get("consentPd"),
          age: !!fd.get("consentAge"),
          terms: !!fd.get("consentTerms"),
        },
      });
      showOtpStep(pending);
    } catch (err) {
      msg.textContent =
        err.message === "exists"
          ? "Email already registered — sign in"
          : err.message === "consents"
            ? "Accept all consents"
            : err.message === "rate_limited"
              ? "Too many codes — try later"
              : "Check email / form";
    }
  });

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById("gateMsg");
    msg.textContent = "";
    try {
      const pending = await Auth().requestOtp({
        mode: "login",
        email: String(fd.get("email")),
      });
      showOtpStep(pending);
    } catch (err) {
      msg.textContent =
        err.message === "not_found"
          ? "No account — register first"
          : err.message === "rate_limited"
            ? "Too many codes — try later"
            : "Check email";
    }
  });

  document.getElementById("otpForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById("gateMsg");
    try {
      Auth().verifyOtp(fd.get("code"));
      msg.textContent = "";
      hideGate();
      refreshUserUI();
      location.hash = "#/test";
      route();
    } catch (err) {
      msg.textContent =
        err.message === "expired" ? "Code expired — request again" : "Wrong code";
    }
  });

  window.addEventListener("bridge:auth", () => {
    refreshUserUI();
    if (!Auth().isAuthed()) enforceGate();
  });
}

function showOtpStep(pending) {
  showGate("otp");
  const demo = document.getElementById("otpDemo");
  const hint = document.getElementById("otpHint");
  if (pending.demo && pending.code) {
    demo.hidden = false;
    demo.textContent = `CODE: ${pending.code}`;
    if (hint) hint.hidden = false;
  } else {
    demo.hidden = true;
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        I18N().lang === "en"
          ? "We sent a 4-digit code to your email."
          : I18N().lang === "tg"
            ? "Рамзи 4-рақама ба почтаи шумо фиристода шуд."
            : "Мы отправили 4-значный код на вашу почту.";
    }
  }
}

/* ---------- Router ---------- */
function parseHash() {
  const h = (location.hash || "#/").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "uni" && parts[1]) return { view: "uni", id: parts[1] };
  if (parts[0] === "test") return { view: "home", scroll: "test" };
  if (parts[0] === "unis") return { view: "home", scroll: "unis" };
  if (parts[0] === "checklist") return { view: "home", scroll: "checklist" };
  if (parts[0] === "plan") return { view: "home", scroll: "plan" };
  return { view: "home" };
}

function route() {
  if (!Auth().isAuthed()) {
    enforceGate();
    return;
  }
  const r = parseHash();
  const home = document.getElementById("homeView");
  const page = document.getElementById("uniPage");
  if (r.view === "uni") {
    home.hidden = true;
    page.hidden = false;
    renderUniPage(r.id);
    window.scrollTo(0, 0);
  } else {
    home.hidden = false;
    page.hidden = true;
    renderUniversities(currentFilter);
    setupTestUI();
    renderChecklist();
    if (r.scroll) {
      setTimeout(() => document.getElementById(r.scroll)?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }
}

/* ---------- Universities ---------- */
let currentFilter = "all";
let currentSort = "default";
let currentQuery = "";
let currentCluster = "all";

function recommendedIds() {
  const u = Auth().currentUser();
  return (u && u.result && u.result.uniIds) || [];
}

function renderUniversities(filter = currentFilter) {
  currentFilter = filter;
  const track = document.getElementById("uniTrack");
  if (!track) return;
  const mine = new Set(recommendedIds());
  const t = I18N();
  const q = currentQuery.trim().toLowerCase();
  let list = (window.BRIDGE_UNIS || []).filter((u) => {
    if (filter === "mine") return mine.has(u.id);
    if (filter !== "all" && u.tier !== filter) return false;
    if (currentCluster !== "all" && !(u.clusters || []).includes(currentCluster)) return false;
    if (!q) return true;
    const blob = [
      t.loc(u.name),
      t.loc(u.city),
      t.loc(u.blurb),
      ...(u.majors || []),
      ...(u.englishPrograms || []),
      ...(u.clusters || []),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
  if (currentSort === "price_asc") list = [...list].sort((a, b) => (a.tuitionYear || 0) - (b.tuitionYear || 0));
  if (currentSort === "price_desc") list = [...list].sort((a, b) => (b.tuitionYear || 0) - (a.tuitionYear || 0));
  if (currentSort === "name") {
    list = [...list].sort((a, b) => t.loc(a.name).localeCompare(t.loc(b.name), t.lang));
  }

  track.innerHTML = "";
  const countEl = document.getElementById("uniCount");
  if (countEl) countEl.textContent = String(list.length);
  if (!list.length) {
    track.innerHTML = `<p class="empty-unis">—</p>`;
    return;
  }
  list.forEach((u) => {
    const card = document.createElement("article");
    card.className = `uni-card ${u.tier}${mine.has(u.id) ? " is-mine" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    const majors = (u.englishPrograms || u.majors || []).slice(0, 2).map(trPhrase).map(escapeHtml).join(" · ");
    card.innerHTML = `
      <div class="uni-rank">${escapeHtml(u.rankCN ?? "—")}</div>
      <h3>${escapeHtml(t.loc(u.name))}</h3>
      <p class="major">${majors}</p>
      <p>${escapeHtml(t.loc(u.blurb))}</p>
      <div class="uni-meta">
        <span>${escapeHtml(moneyTriple(u.tuitionYear))}</span>
        <span>${escapeHtml(t.loc(u.city))}</span>
      </div>
    `;
    const go = () => {
      location.hash = `#/uni/${u.id}`;
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
    track.appendChild(card);
  });
}

function renderUniPage(id) {
  const u = (window.BRIDGE_UNIS || []).find((x) => x.id === id);
  const body = document.getElementById("uniPageBody");
  const t = I18N();
  if (!u) {
    body.innerHTML = `<p>—</p><a href="#/unis">${t.t("uni_back")}</a>`;
    return;
  }
  const q = u.quota || {};
  const save = q.saveVsPaidYear || 0;
  const feeNote = u.feeLive ? t.t("uni_fee_live") : t.t("uni_fee_static");
  const docs = (u.documents || []).map((raw) => window.BRIDGE_DOC_UTILS.resolve(raw));
  body.innerHTML = `
    <a class="btn ghost uni-back" href="#/unis">${t.t("uni_back")}</a>
    <p class="eyebrow">${escapeHtml(t.loc(u.city))} · ${escapeHtml(tierLabel(u.tier))}</p>
    <h1>${escapeHtml(t.loc(u.name))}</h1>
    <p class="modal-blurb">${escapeHtml(t.loc(u.blurb))}</p>
    <div class="modal-links">
      <a class="btn primary" href="${u.portal}" target="_blank" rel="noopener">${t.t("uni_portal")}</a>
      ${u.apply ? `<a class="btn ghost" href="${u.apply}" target="_blank" rel="noopener">${t.t("uni_apply")}</a>` : ""}
    </div>

    <div class="uni-detail-grid">
      <article class="glass detail-block">
        <h3>${t.t("uni_rank")}</h3>
        <table class="info-table">
          <tr><td>CN</td><td>${u.rankCN ?? "—"}</td></tr>
          <tr><td>World</td><td>${u.rankWorld ?? "—"}</td></tr>
          <tr><td>English</td><td>${trPhrase(u.englishReq) || "—"}</td></tr>
          <tr><td>CSCA</td><td>${(u.csca || []).map(trPhrase).join("; ") || "—"}</td></tr>
        </table>
      </article>

      <article class="glass detail-block">
        <h3>${t.t("uni_majors")}</h3>
        <ul class="chip-list">
          ${(u.majors || []).map((m) => `<li>${trPhrase(m)}</li>`).join("")}
        </ul>
        <p class="muted">${t.t("uni_en_programs")}: ${(u.englishPrograms || []).map(trPhrase).join(", ") || "—"}</p>
      </article>

      <article class="glass detail-block">
        <h3>${t.t("uni_tuition")}</h3>
        <p class="muted">${t.t("uni_fx_note")} · FX ${FX().updated}</p>
        <p class="muted">${feeNote}${u.feeLive?.sourceUrl ? ` · <a href="${u.feeLive.sourceUrl}" target="_blank" rel="noopener">${t.t("uni_source")}</a>` : ""}</p>
        <table class="info-table cost-table">
          <tr><td>${t.t("uni_tuition")}</td><td>${moneyTriple(u.tuitionYear)}</td></tr>
          <tr><td>${t.t("uni_dorm")}</td><td>${moneyTriple(u.dormYear)}</td></tr>
          <tr><td>${t.t("uni_insurance")}</td><td>${moneyTriple(u.insuranceYear)}</td></tr>
          <tr><td>${t.t("uni_living")}</td><td>${moneyTriple(u.livingMonth)}</td></tr>
          <tr><td>${t.t("uni_application")}</td><td>${moneyTriple(u.applicationFee || 0)}</td></tr>
          <tr class="total"><td>${t.t("uni_year")}</td><td>${moneyTriple(yearBudget(u))}</td></tr>
        </table>
      </article>

      <article class="glass detail-block highlight">
        <h3>${t.t("uni_quota")}</h3>
        <p><strong>${q.type || "CSC"}</strong></p>
        <ul>
          <li>${t.t("uni_quota_cover")}: ${formatCover(q.coverTuition)}</li>
          <li>${t.t("uni_quota_stipend")}: ${q.stipendMonth != null ? moneyTriple(q.stipendMonth) : "—"}</li>
          <li>${t.t("uni_quota_dorm")}: ${formatCover(q.dormCovered)}</li>
        </ul>
        <p class="save-line"><span>${t.t("uni_save")}</span><strong>${moneyTriple(save)}</strong></p>
        ${u.sourceNote ? `<p class="muted">${t.t("uni_source")}: ${u.sourceNote}</p>` : ""}
      </article>

      <article class="glass detail-block">
        <h3>${t.t("uni_docs")}</h3>
        <p class="muted">${t.t("doc_click_hint")}</p>
        <ol class="doc-list">
          ${docs
            .map(
              (d, i) =>
                `<li><button type="button" class="doc-link" data-doc-idx="${i}">${t.loc(d.title)}</button></li>`
            )
            .join("")}
        </ol>
      </article>

      <article class="glass detail-block">
        <h3>${t.t("uni_exams")}</h3>
        <ul>${(u.exams || []).map((d) => `<li>${trPhrase(d)}</li>`).join("")}</ul>
      </article>
    </div>
  `;

  body.querySelectorAll(".doc-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const doc = docs[Number(btn.dataset.docIdx)];
      openDocModal(doc);
    });
  });
}

function openDocModal(doc) {
  const t = I18N();
  const modal = document.getElementById("docModal");
  const body = document.getElementById("docModalBody");
  body.innerHTML = `
    <h2>${t.loc(doc.title)}</h2>
    <h3>${t.t("doc_what")}</h3>
    <p>${t.loc(doc.what)}</p>
    <h3>${t.t("doc_how")}</h3>
    <p>${t.loc(doc.how)}</p>
  `;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDocModal() {
  const modal = document.getElementById("docModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

/* ---------- Checklist ---------- */
function checklistKey() {
  const u = Auth().currentUser();
  return u ? `bridge-check-${u.email}` : "bridge-check-anon";
}

function renderChecklist() {
  const root = document.getElementById("checkGroups");
  if (!root) return;
  const state = loadJSON(checklistKey(), {});
  const t = I18N();
  root.innerHTML = "";
  CHECKLIST.forEach((group) => {
    const wrap = document.createElement("div");
    wrap.className = "check-group";
    wrap.innerHTML = `<h4>${t.loc(group.title)}</h4>`;
    group.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "check-item" + (state[item.id] ? " done" : "");
      const id = `c_${item.id}`;
      row.innerHTML = `
        <input type="checkbox" id="${id}" ${state[item.id] ? "checked" : ""} />
        <label for="${id}">${t.loc(item.label)}</label>
      `;
      row.querySelector("input").addEventListener("change", (e) => {
        const next = loadJSON(checklistKey(), {});
        next[item.id] = e.target.checked;
        saveJSON(checklistKey(), next);
        row.classList.toggle("done", e.target.checked);
        updateProgress();
      });
      wrap.appendChild(row);
    });
    root.appendChild(wrap);
  });
  updateProgress();
}

function updateProgress() {
  const state = loadJSON(checklistKey(), {});
  const ids = CHECKLIST.flatMap((g) => g.items.map((i) => i.id));
  const done = ids.filter((id) => state[id]).length;
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
  document.getElementById("checkRing")?.style.setProperty("--p", String(pct));
  const pctEl = document.getElementById("checkPct");
  const countEl = document.getElementById("checkCount");
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (countEl) countEl.textContent = `${done} / ${ids.length}`;
}

/* ---------- Test ---------- */
let designPromise = null;

function getDesign() {
  if (!designPromise) designPromise = window.BRIDGE_TEST.loadDesign();
  return designPromise;
}

async function setupTestUI() {
  const user = Auth().currentUser();
  const wizard = document.getElementById("testWizard");
  const result = document.getElementById("testResult");
  if (!wizard) return;
  if (!user) return;

  if (user.result) {
    wizard.hidden = true;
    result.hidden = false;
    renderTestResult(user.result);
  } else {
    result.hidden = true;
    wizard.hidden = false;
    await startTest();
  }
}

async function startTest() {
  const design = await getDesign();
  const wizard = document.getElementById("testWizard");
  const result = document.getElementById("testResult");
  result.hidden = true;
  wizard.hidden = false;
  const questions = design.questions;
  let step = 0;
  const answers = {};
  const t = I18N();

  function draw() {
    const q = questions[step];
    let optionsHtml = "";
    if (q.format === "likert5") {
      optionsHtml = [1, 2, 3, 4, 5]
        .map(
          (n) =>
            `<button type="button" class="test-opt" data-v="${n}">${n}. ${t.t("likert_" + n)}</button>`
        )
        .join("");
    } else if (q.format === "forced4") {
      optionsHtml = (q.options || [])
        .map((o) => {
          const id = o.id || o.k;
          return `<button type="button" class="test-opt" data-v="${id}">${o.text || o.t}</button>`;
        })
        .join("");
    } else if (q.format === "pick2of4") {
      optionsHtml = `
        <div class="pick-grid">
          ${(q.options || [])
            .map((o) => {
              const id = o.id || o.k;
              return `<label class="pick-opt"><input type="checkbox" value="${id}" /><span>${o.text || o.t}</span></label>`;
            })
            .join("")}
        </div>
        <p class="form-note" id="pickMsg" hidden></p>
        <button type="button" class="btn primary" id="pickNext">${t.t("pick_next")}</button>
      `;
    }

    const text = typeof q.text === "object" ? t.loc(q.text) : q.text;
    wizard.innerHTML = `
      <div class="test-progress">${t.t("test_progress", { n: step + 1, total: questions.length })}</div>
      <h3>${text}</h3>
      <div class="test-options">${optionsHtml}</div>
    `;

    if (q.format === "pick2of4") {
      const boxes = [...wizard.querySelectorAll('input[type="checkbox"]')];
      boxes.forEach((box) => {
        box.addEventListener("change", () => {
          const checked = boxes.filter((b) => b.checked);
          if (checked.length > 2) {
            box.checked = false;
          }
        });
      });
      wizard.querySelector("#pickNext").addEventListener("click", () => {
        const picks = boxes.filter((b) => b.checked).map((i) => i.value).slice(0, 2);
        const msg = wizard.querySelector("#pickMsg");
        if (!picks.length) {
          msg.hidden = false;
          msg.textContent = t.t("pick_need");
          return;
        }
        msg.hidden = true;
        answers[q.id] = picks;
        advance();
      });
    } else {
      wizard.querySelectorAll(".test-opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          answers[q.id] = btn.dataset.v;
          advance();
        });
      });
    }
  }

  function advance() {
    step += 1;
    if (step >= questions.length) finishTest(design, answers);
    else draw();
  }

  draw();
}

function finishTest(design, answers) {
  let result;
  try {
    result = window.BRIDGE_TEST.buildResult(design, answers);
  } catch (err) {
    console.error(err);
    document.getElementById("testWizard").innerHTML = `<p class="form-note">Error building result</p>`;
    return;
  }
  Auth().saveUserResult(result);
  document.getElementById("testWizard").hidden = true;
  document.getElementById("testResult").hidden = false;
  renderTestResult(result);
  renderUniversities("mine");
  document.querySelectorAll(".uni-filters button").forEach((b) => b.classList.remove("active"));
  document.getElementById("filterMine")?.classList.add("active");
  // Stay on test results (do NOT jump away — that looked like "nothing happened")
  if (location.hash !== "#/test") location.hash = "#/test";
  setTimeout(() => document.getElementById("test")?.scrollIntoView({ behavior: "smooth" }), 50);
}

function renderTestResult(result) {
  const box = document.getElementById("testResult");
  const t = I18N();
  const unis = (result.uniIds || [])
    .map((id) => (window.BRIDGE_UNIS || []).find((u) => u.id === id))
    .filter(Boolean);

  box.hidden = false;
  box.innerHTML = `
    <div class="result-banner">
      <h3>${t.t("result_title")}</h3>
      <p>${result.summary}</p>
      <p class="muted">${t.t("result_match_note")}</p>
    </div>
    <div class="cluster-pills">
      ${(result.rankedClusters || [])
        .map((c) => `<span class="pill">${c.label} <em>${c.score}</em></span>`)
        .join("")}
    </div>
    <h4>${t.t("result_professions")}</h4>
    <ul class="prof-list">
      ${(result.professions || [])
        .map((p) => `<li><strong>${p.name}</strong> <span class="muted">${p.clusterLabel}</span></li>`)
        .join("")}
    </ul>
    <h4>${t.t("result_unis")}</h4>
    <div class="result-unis">
      ${unis.length
        ? unis
            .map(
              (u) => `
        <a class="result-uni" href="#/uni/${u.id}">
          <strong>${t.loc(u.name)}</strong>
          <span>${trPhrase((u.englishPrograms || [])[0] || (u.majors || [])[0] || "")}</span>
          <em>${moneyTriple(u.tuitionYear)}</em>
        </a>`
            )
            .join("")
        : `<p class="form-note">—</p>`}
    </div>
    <div class="hero-actions" style="margin-top:16px">
      <a class="btn primary" href="#/unis">${t.t("result_see_unis")}</a>
      <button class="btn ghost" type="button" id="retakeTest">${t.t("result_retake")}</button>
    </div>
    <p class="muted">${t.t("result_disclaimer")}</p>
  `;
  document.getElementById("retakeTest")?.addEventListener("click", async () => {
    Auth().saveUserResult(null);
    box.hidden = true;
    await startTest();
  });
}

/* ---------- Chrome ---------- */
function setupNav() {
  document.querySelectorAll(".uni-filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".uni-filters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderUniversities(btn.dataset.filter);
    });
  });
  document.getElementById("uniSearch")?.addEventListener("input", (e) => {
    currentQuery = e.target.value || "";
    renderUniversities(currentFilter);
  });
  document.getElementById("uniSort")?.addEventListener("change", (e) => {
    currentSort = e.target.value || "default";
    renderUniversities(currentFilter);
  });
  document.getElementById("uniCluster")?.addEventListener("change", (e) => {
    currentCluster = e.target.value || "all";
    renderUniversities(currentFilter);
  });
  document.getElementById("resetChecks")?.addEventListener("click", () => {
    localStorage.removeItem(checklistKey());
    renderChecklist();
  });
  document.querySelectorAll("[data-close-doc]").forEach((el) => {
    el.addEventListener("click", closeDocModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDocModal();
  });
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.intersecting || entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  nodes.forEach((n) => io.observe(n));
}

function setupScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

document.addEventListener("DOMContentLoaded", async () => {
  setupLang();
  setupAuthUI();
  setupNav();
  setupReveal();
  setupScrollProgress();
  await loadLiveFees();
  window.addEventListener("hashchange", route);
  enforceGate();
  if (Auth().isAuthed()) route();
});
