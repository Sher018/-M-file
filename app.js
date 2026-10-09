const STORAGE_KEY = "bridge-checklist-v1";

const CHECKLIST = [
  {
    title: "На этой неделе",
    items: [
      {
        id: "w1",
        label: "Записаться на IELTS Academic",
        hint: "Цель: overall 6.5 (минимум 6.0)",
      },
      {
        id: "w2",
        label: "Создать аккаунт на CSCA (csca.cn)",
        hint: "Сдавать Mathematics на английском",
      },
      {
        id: "w3",
        label: "Проверить срок паспорта",
        hint: "Лучше действие до 2028–2029+",
      },
      {
        id: "w4",
        label: "Выбрать 6 вузов из шортлиста",
        hint: "2 мечта + 2 реализм + 2 запас",
      },
    ],
  },
  {
    title: "Документы",
    items: [
      {
        id: "d1",
        label: "Скан паспорта (чёткое фото)",
      },
      {
        id: "d2",
        label: "Аттестат или справка о скором выпуске",
      },
      {
        id: "d3",
        label: "Транскрипт оценок + нотариальный перевод на EN",
      },
      {
        id: "d4",
        label: "Справка о несудимости",
      },
      {
        id: "d5",
        label: "Медсправка Foreigner Physical Examination",
      },
      {
        id: "d6",
        label: "1–2 рекомендательных письма",
      },
      {
        id: "d7",
        label: "Фото как на паспорт (белый фон)",
      },
    ],
  },
  {
    title: "Подготовка 3 месяца",
    items: [
      {
        id: "p1",
        label: "IELTS: 4–5 тренировок в неделю",
        hint: "Каждые 2 недели — полный mock-тест",
      },
      {
        id: "p2",
        label: "CSCA Math: 3 коротких занятия по 40–60 мин",
        hint: "Без геройства. Только нужные темы",
      },
      {
        id: "p3",
        label: "Черновик Motivation Letter",
        hint: "Тема: мост Таджикистан ↔ Китай через торговлю и коммуникации",
      },
      {
        id: "p4",
        label: "Мини-проект: канал про культуры / бизнес",
        hint: "Показывает креатив и влияние",
      },
      {
        id: "p5",
        label: "Кейс: «таджикский товар → Китай» на 2–3 страницы",
      },
    ],
  },
  {
    title: "ИИ правильно",
    items: [
      {
        id: "a1",
        label: "Освоить ChatGPT/Claude для маркетинга и текстов",
        hint: "Не учить «нейросети с нуля»",
      },
      {
        id: "a2",
        label: "Canva + AI для контента",
      },
      {
        id: "a3",
        label: "Базовый Excel / Google Sheets",
      },
      {
        id: "a4",
        label: "Короткий курс AI for Business / Digital Marketing",
      },
    ],
  },
  {
    title: "Подача",
    items: [
      {
        id: "s1",
        label: "Подать в ZJU GCM / UIBE / BFSU",
      },
      {
        id: "s2",
        label: "Подать в SILC / BIT / Jiangsu University",
      },
      {
        id: "s3",
        label: "Следить за CSC Type A на сайте посольства КНР в Таджикистане",
      },
      {
        id: "s4",
        label: "Загрузить CSCA transcript во все заявки",
      },
      {
        id: "s5",
        label: "После offer: JW202 → виза X1 → жильё",
      },
    ],
  },
];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function allItemIds() {
  return CHECKLIST.flatMap((group) => group.items.map((item) => item.id));
}

function renderChecklist() {
  const root = document.getElementById("checkGroups");
  const state = loadState();
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
        <label for="${item.id}">
          ${item.label}
          ${item.hint ? `<small>${item.hint}</small>` : ""}
        </label>
      `;
      const input = row.querySelector("input");
      input.addEventListener("change", () => {
        const next = loadState();
        next[item.id] = input.checked;
        saveState(next);
        row.classList.toggle("done", input.checked);
        updateProgress();
      });
      wrap.appendChild(row);
    });

    root.appendChild(wrap);
  });

  updateProgress();
}

function updateProgress() {
  const state = loadState();
  const ids = allItemIds();
  const done = ids.filter((id) => state[id]).length;
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
  const ring = document.getElementById("checkRing");
  const pctEl = document.getElementById("checkPct");
  const countEl = document.getElementById("checkCount");
  ring.style.setProperty("--p", String(pct));
  pctEl.textContent = `${pct}%`;
  countEl.textContent = `${done} из ${ids.length} выполнено`;
}

function setupNav() {
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.getAttribute("data-scroll"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupFilters() {
  const buttons = document.querySelectorAll(".uni-filters button");
  const cards = document.querySelectorAll(".uni-card");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.tier === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal, .meter");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );
  nodes.forEach((node) => io.observe(node));
}

function setupScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = `${p}%`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupReset() {
  document.getElementById("resetChecks").addEventListener("click", () => {
    if (confirm("Сбросить все отметки чек-листа?")) {
      localStorage.removeItem(STORAGE_KEY);
      renderChecklist();
    }
  });
}

function setupPrint() {
  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

document.addEventListener("DOMContentLoaded", () => {
  renderChecklist();
  setupNav();
  setupFilters();
  setupReveal();
  setupScrollProgress();
  setupReset();
  setupPrint();
});
