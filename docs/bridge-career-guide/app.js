const STORAGE_KEY = "bridge-checklist-v1";
const USERS_KEY = "bridge-users-v1";
const SESSION_KEY = "bridge-session-v1";

const CHECKLIST = [
  {
    title: "На этой неделе",
    items: [
      { id: "w1", label: "Записаться на IELTS Academic", hint: "Цель: overall 6.5 (минимум 6.0)" },
      { id: "w2", label: "Создать аккаунт на CSCA (csca.cn)", hint: "Mathematics на английском" },
      { id: "w3", label: "Проверить срок паспорта", hint: "Лучше до 2028–2029+" },
      { id: "w4", label: "Выбрать 6 вузов из шортлиста", hint: "2 мечта + 2 реализм + 2 запас" },
    ],
  },
  {
    title: "Документы",
    items: [
      { id: "d1", label: "Скан паспорта" },
      { id: "d2", label: "Аттестат / справка о выпуске" },
      { id: "d3", label: "Транскрипт + нотариальный перевод EN" },
      { id: "d4", label: "Справка о несудимости" },
      { id: "d5", label: "Медсправка Foreigner Physical Examination" },
      { id: "d6", label: "1–2 рекомендации" },
      { id: "d7", label: "Фото на белом фоне" },
    ],
  },
  {
    title: "Подача",
    items: [
      { id: "s1", label: "Подать в 2–3 вуза «мечты»" },
      { id: "s2", label: "Подать в 2–3 реалистичных / бюджетных" },
      { id: "s3", label: "Следить за CSC Type A (посольство КНР)" },
      { id: "s4", label: "Загрузить CSCA transcript во все заявки" },
      { id: "s5", label: "После offer: JW202 → виза X1" },
    ],
  },
];

function money(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("ru-RU")} CNY`;
}

function yearBudget(c) {
  const living = (c.livingMonth || 0) * 10;
  return (c.tuitionYear || 0) + (c.dormYear || 0) + (c.insuranceYear || 0) + living + (c.application || 0);
}

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

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return `h${Math.abs(h)}`;
}

function getSession() {
  return loadJSON(SESSION_KEY, null);
}

function setSession(user) {
  if (!user) localStorage.removeItem(SESSION_KEY);
  else saveJSON(SESSION_KEY, { email: user.email, name: user.name });
  refreshUserUI();
}

function getUsers() {
  return loadJSON(USERS_KEY, {});
}

function getCurrentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers()[s.email] || null;
}

function refreshUserUI() {
  const user = getCurrentUser();
  const pill = document.getElementById("userPill");
  const btn = document.getElementById("navAuthBtn");
  if (user) {
    pill.hidden = false;
    pill.textContent = user.name;
    btn.textContent = "Мой тест";
    btn.onclick = () => document.getElementById("test").scrollIntoView({ behavior: "smooth" });
  } else {
    pill.hidden = true;
    btn.textContent = "Регистрация";
    btn.onclick = () => document.getElementById("auth").scrollIntoView({ behavior: "smooth" });
  }
  setupTestUI();
  renderUniversities(currentFilter);
}

/* ---------- Universities ---------- */
let currentFilter = "all";

function recommendedIds(user) {
  return (user && user.result && user.result.uniIds) || [];
}

function renderUniversities(filter = "all") {
  currentFilter = filter;
  const track = document.getElementById("uniTrack");
  const user = getCurrentUser();
  const mine = new Set(recommendedIds(user));
  const list = window.BRIDGE_DATA.universities.filter((u) => {
    if (filter === "all") return true;
    if (filter === "mine") return mine.has(u.id);
    return u.tier === filter;
  });

  track.innerHTML = "";
  if (!list.length) {
    track.innerHTML = `<p class="empty-unis">Пока нет вузов в этом фильтре. Пройди тест — появится «Мои».</p>`;
    return;
  }

  list.forEach((u) => {
    const card = document.createElement("article");
    card.className = `uni-card ${u.tier}${mine.has(u.id) ? " is-mine" : ""}`;
    card.dataset.tier = u.tier;
    card.dataset.id = u.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.innerHTML = `
      <div class="uni-rank">${u.rank}</div>
      <h3>${u.name}</h3>
      <p class="major">${u.major}</p>
      <p>${u.blurb}</p>
      <div class="uni-meta">
        <span>${money(u.costs.tuitionYear)}/год</span>
        <span>${u.english.split("/")[0].trim()}</span>
      </div>
      <span class="uni-click-hint">Нажми → документы, экзамены, бюджет</span>
    `;
    card.addEventListener("click", () => openUniModal(u.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUniModal(u.id);
      }
    });
    track.appendChild(card);
  });
}

function openUniModal(id) {
  const u = window.BRIDGE_DATA.universities.find((x) => x.id === id);
  if (!u) return;
  const c = u.costs;
  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <p class="eyebrow">${u.city} · ${u.short}</p>
    <h2 id="modalTitle">${u.name}</h2>
    <p class="modal-major">${u.major}</p>
    <p class="modal-blurb">${u.blurb}</p>
    <div class="modal-links">
      <a class="btn tiny" href="${u.portal}" target="_blank" rel="noopener">Сайт вуза</a>
      <a class="btn tiny" href="${u.apply}" target="_blank" rel="noopener">Подача онлайн</a>
    </div>

    <div class="modal-grid">
      <div class="modal-block">
        <h3>Документы</h3>
        <table class="info-table">
          <thead><tr><th>#</th><th>Документ</th></tr></thead>
          <tbody>
            ${u.documents.map((d, i) => `<tr><td>${i + 1}</td><td>${d}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="modal-block">
        <h3>Испытания / экзамены</h3>
        <table class="info-table">
          <thead><tr><th>Тип</th><th>Детали</th></tr></thead>
          <tbody>
            <tr><td>Английский</td><td>${u.english}</td></tr>
            <tr><td>CSCA</td><td>${u.csca.join("; ")}</td></tr>
            ${u.exams.map((e) => `<tr><td>Этап</td><td>${e}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-block">
      <h3>Бюджет (ориентир)</h3>
      <p class="muted">${window.BRIDGE_DATA.currencyNote}</p>
      <table class="info-table cost-table">
        <thead><tr><th>Статья</th><th>Сумма</th></tr></thead>
        <tbody>
          <tr><td>Application fee</td><td>${money(c.application)}</td></tr>
          ${c.deposit ? `<tr><td>Депозит / advance</td><td>${money(c.deposit)}</td></tr>` : ""}
          <tr><td>Tuition / год</td><td>${money(c.tuitionYear)}</td></tr>
          <tr><td>Общежитие / год</td><td>${money(c.dormYear)}</td></tr>
          <tr><td>Страховка / год</td><td>${money(c.insuranceYear)}</td></tr>
          <tr><td>Жизнь / месяц</td><td>${money(c.livingMonth)}</td></tr>
          <tr class="total"><td>Ориентир 1-го года*</td><td>${money(yearBudget(c))}</td></tr>
        </tbody>
      </table>
      <p class="muted">*Tuition + dorm + insurance + ~10 мес. жизни + application. ${c.notes || ""}</p>
      <div class="cost-bars" aria-hidden="true">
        <div class="cbar"><span>Учёба</span><i style="--w:${Math.min(100, (c.tuitionYear / 120000) * 100)}%"></i></div>
        <div class="cbar"><span>Жильё</span><i style="--w:${Math.min(100, (c.dormYear / 15000) * 100)}%"></i></div>
        <div class="cbar"><span>Жизнь×10</span><i style="--w:${Math.min(100, ((c.livingMonth * 10) / 30000) * 100)}%"></i></div>
      </div>
    </div>
  `;
  const modal = document.getElementById("uniModal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("uniModal").hidden = true;
  document.body.style.overflow = "";
}

/* ---------- Checklist ---------- */
function checklistStorageKey() {
  const u = getCurrentUser();
  return u ? `bridge-check-${u.email}` : STORAGE_KEY;
}

function loadChecks() {
  return loadJSON(checklistStorageKey(), {});
}

function saveChecks(state) {
  saveJSON(checklistStorageKey(), state);
}

function allItemIds() {
  return CHECKLIST.flatMap((g) => g.items.map((i) => i.id));
}

function renderChecklist() {
  const root = document.getElementById("checkGroups");
  const state = loadChecks();
  root.innerHTML = "";
  CHECKLIST.forEach((group) => {
    const wrap = document.createElement("div");
    wrap.className = "check-group";
    wrap.innerHTML = `<h4>${group.title}</h4>`;
    group.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "check-item" + (state[item.id] ? " done" : "");
      row.innerHTML = `
        <input type="checkbox" id="${item.id}" ${state[item.id] ? "checked" : ""} />
        <label for="${item.id}">${item.label}${item.hint ? `<small>${item.hint}</small>` : ""}</label>
      `;
      row.querySelector("input").addEventListener("change", (e) => {
        const next = loadChecks();
        next[item.id] = e.target.checked;
        saveChecks(next);
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
  const state = loadChecks();
  const ids = allItemIds();
  const done = ids.filter((id) => state[id]).length;
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
  document.getElementById("checkRing").style.setProperty("--p", String(pct));
  document.getElementById("checkPct").textContent = `${pct}%`;
  document.getElementById("checkCount").textContent = `${done} из ${ids.length} выполнено`;
}

/* ---------- Auth ---------- */
function setupAuth() {
  document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email")).trim().toLowerCase();
    const users = getUsers();
    const msg = document.getElementById("registerMsg");
    if (users[email]) {
      msg.textContent = "Такой email уже зарегистрирован. Войди справа.";
      return;
    }
    const user = {
      email,
      name: String(fd.get("name")).trim(),
      country: fd.get("country"),
      pass: simpleHash(String(fd.get("password"))),
      createdAt: new Date().toISOString(),
      consents: {
        pd: true,
        age: true,
        terms: true,
        at: new Date().toISOString(),
        lawNote: "Consent under RF 152-FZ principles + TJ personal data consent for service purpose",
      },
      result: null,
    };
    users[email] = user;
    saveJSON(USERS_KEY, users);
    setSession(user);
    msg.textContent = "Готово! Переходим к тесту…";
    document.getElementById("test").scrollIntoView({ behavior: "smooth" });
    setupTestUI();
  });

  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email")).trim().toLowerCase();
    const user = getUsers()[email];
    const msg = document.getElementById("loginMsg");
    if (!user || user.pass !== simpleHash(String(fd.get("password")))) {
      msg.textContent = "Неверный email или пароль.";
      return;
    }
    setSession(user);
    msg.textContent = `С возвращением, ${user.name}!`;
    renderChecklist();
    setupTestUI();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    if (!confirm("Выйти и очистить локальные данные этого браузера (аккаунты + прогресс)?")) return;
    localStorage.clear();
    setSession(null);
    renderChecklist();
    setupTestUI();
    renderUniversities("all");
    document.getElementById("loginMsg").textContent = "Локальные данные очищены.";
  });
}

/* ---------- Test ---------- */
function setupTestUI() {
  const user = getCurrentUser();
  const locked = document.getElementById("testLocked");
  const wizard = document.getElementById("testWizard");
  const result = document.getElementById("testResult");
  const lead = document.getElementById("testLead");

  if (!user) {
    locked.hidden = false;
    wizard.hidden = true;
    result.hidden = true;
    lead.textContent = "После регистрации откроется короткий тест.";
    return;
  }

  locked.hidden = true;
  if (user.result) {
    wizard.hidden = true;
    result.hidden = false;
    renderTestResult(user.result);
    lead.textContent = `${user.name}, твой результат сохранён. Можно пройти тест заново ниже.`;
    result.insertAdjacentHTML(
      "beforeend",
      `<button class="btn tiny" type="button" id="retakeTest">Пройти тест заново</button>`
    );
    document.getElementById("retakeTest")?.addEventListener("click", () => startTest());
  } else {
    startTest();
  }
}

function startTest() {
  const wizard = document.getElementById("testWizard");
  const result = document.getElementById("testResult");
  result.hidden = true;
  wizard.hidden = false;
  const questions = window.BRIDGE_DATA.testQuestions;
  let step = 0;
  const answers = {};

  function draw() {
    const q = questions[step];
    wizard.innerHTML = `
      <div class="test-progress">Вопрос ${step + 1} / ${questions.length}</div>
      <h3>${q.text}</h3>
      <div class="test-options">
        ${q.options
          .map(
            (o) => `<button type="button" class="test-opt" data-k="${o.k}">${o.k}) ${o.t}</button>`
          )
          .join("")}
      </div>
    `;
    wizard.querySelectorAll(".test-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        answers[q.id] = btn.dataset.k;
        step += 1;
        if (step >= questions.length) finishTest(answers);
        else draw();
      });
    });
  }
  draw();
}

function finishTest(answers) {
  const scores = {};
  const banned = new Set();
  window.BRIDGE_DATA.testQuestions.forEach((q) => {
    const key = answers[q.id];
    const opt = q.options.find((o) => o.k === key);
    if (!opt) return;
    Object.entries(opt.tags || {}).forEach(([t, v]) => {
      scores[t] = (scores[t] || 0) + v;
    });
    (opt.ban || []).forEach((b) => banned.add(b));
  });

  // Rank universities by tag overlap
  const ranked = window.BRIDGE_DATA.universities
    .map((u) => {
      let score = 0;
      u.tags.forEach((t) => {
        score += scores[t] || 0;
      });
      if (banned.has("eng") && u.tags.includes("eng")) score -= 10;
      // budget preference
      if (scores.budget && u.tier === "budget") score += 2;
      if (scores.premium && (u.tier === "dream" || u.id === "xjtlu" || u.id === "unnc")) score += 1;
      return { id: u.id, score, u };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 5);
  const profile = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  const result = {
    at: new Date().toISOString(),
    scores,
    profile,
    uniIds: top.map((t) => t.id),
    summary:
      profile[0] === "tech" || profile[0] === "eng"
        ? "У тебя тяга к технологиям — но для Китая English business/trade всё равно часто реалистичнее без сильной математики."
        : "Тебе ближе бизнес, коммуникации и международная среда — English-track trade/business/media в Китае.",
  };

  const users = getUsers();
  const session = getSession();
  if (session && users[session.email]) {
    users[session.email].result = result;
    saveJSON(USERS_KEY, users);
  }

  document.getElementById("testWizard").hidden = true;
  document.getElementById("testResult").hidden = false;
  renderTestResult(result);
  renderUniversities("mine");
  document.querySelectorAll(".uni-filters button").forEach((b) => b.classList.remove("active"));
  document.getElementById("filterMine").classList.add("active");
  document.getElementById("unis").scrollIntoView({ behavior: "smooth" });
}

function renderTestResult(result) {
  const box = document.getElementById("testResult");
  const unis = result.uniIds
    .map((id) => window.BRIDGE_DATA.universities.find((u) => u.id === id))
    .filter(Boolean);
  box.innerHTML = `
    <h3>Твой результат</h3>
    <p>${result.summary}</p>
    <p><strong>Профиль:</strong> ${result.profile.join(" · ")}</p>
    <div class="result-unis">
      ${unis
        .map(
          (u) => `
        <button type="button" class="result-uni" data-id="${u.id}">
          <strong>${u.name}</strong>
          <span>${u.major}</span>
          <em>${money(u.costs.tuitionYear)}/год</em>
        </button>`
        )
        .join("")}
    </div>
    <p class="muted">Нажми вуз — откроются документы, экзамены и бюджет.</p>
  `;
  box.querySelectorAll(".result-uni").forEach((btn) => {
    btn.addEventListener("click", () => openUniModal(btn.dataset.id));
  });
}

/* ---------- UI chrome ---------- */
function setupNav() {
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(btn.getAttribute("data-scroll"))?.scrollIntoView({ behavior: "smooth" });
    });
  });
  document.querySelectorAll(".uni-filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".uni-filters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderUniversities(btn.dataset.filter);
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  document.getElementById("resetChecks").addEventListener("click", () => {
    if (confirm("Сбросить отметки чек-листа?")) {
      localStorage.removeItem(checklistStorageKey());
      renderChecklist();
    }
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
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

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupAuth();
  setupReveal();
  setupScrollProgress();
  refreshUserUI();
  renderUniversities("all");
  renderChecklist();
});
