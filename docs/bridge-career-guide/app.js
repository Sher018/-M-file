const I18N = () => window.BRIDGE_I18N;
const Auth = () => window.BRIDGE_AUTH;
const FX = () => window.BRIDGE_FX;
const Cat = () => window.BRIDGE_CATALOG;
const Path = () => window.BRIDGE_PATH;

function authErrorText(code) {
  const map = {
    rate_limited: "err_rate_limited",
    send_failed: "err_send_failed",
    bad_email: "err_bad_email",
    consents: "err_consents",
    consents_required: "err_consents",
    exists: "err_exists",
    bad_code: "err_bad_code",
    expired: "err_expired",
    locked: "err_locked",
    signing_not_configured: "err_send_failed",
    rate_limit_unavailable: "err_send_failed",
    captcha: "err_captcha",
    captcha_not_configured: "err_send_failed",
  };
  const key = map[code];
  return key ? I18N().t(key) : I18N().t("err_send_failed");
}

const TURNSTILE_SITEKEY = "0x4AAAAAAFWvlic9fr3UUtfl";
let authWidgetId;

function isLocalDemoHost() {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function mountAuthTurnstile() {
  const el = document.getElementById("turnstileBox");
  if (!el || !window.turnstile || isLocalDemoHost()) return;
  const action = el.dataset.action === "login" ? "login" : "signup";
  if (authWidgetId !== undefined) {
    try {
      window.turnstile.remove(authWidgetId);
    } catch {
      /* previous widget node is already gone */
    }
    authWidgetId = undefined;
  }
  authWidgetId = window.turnstile.render(el, {
    sitekey: TURNSTILE_SITEKEY,
    action,
  });
}

window.onBridgeTurnstileLoad = function () {
  mountAuthTurnstile();
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loc(obj) {
  return I18N().loc(obj);
}

function money(cny) {
  if (cny == null) return I18N().t("no_data");
  return FX().format(cny).label;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2800);
}

function parseHash() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const [pathPart, query] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(query || ""));
  if (parts[0] === "uni" && parts[1]) return { view: "uni", id: parts[1], q };
  if (parts[0] === "auth") return { view: "auth", q };
  if (parts[0] === "unis") return { view: "unis", q };
  if (parts[0] === "test") return { view: "test", q };
  if (parts[0] === "path" || parts[0] === "checklist" || parts[0] === "plan") return { view: "path", q };
  if (parts[0] === "support") return { view: "support", q };
  return { view: "home", q };
}

function setQuery(q) {
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const s = sp.toString();
  location.hash = `#/unis${s ? "?" + s : ""}`;
}

function applyI18n(root = document) {
  const t = I18N();
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t.t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-lang]").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === t.lang);
  });
}

function setupLang() {
  document.querySelectorAll("[data-lang]").forEach((b) => {
    b.addEventListener("click", () => {
      I18N().setLang(b.dataset.lang);
      applyI18n();
      routeNow();
    });
  });
  I18N().setLang(I18N().lang);
}

function refreshUserUI() {
  const user = Auth().currentUser();
  const pill = document.getElementById("userPill");
  const btn = document.getElementById("navAuthBtn");
  const tab = document.getElementById("tabBar");
  if (user) {
    pill.hidden = false;
    pill.textContent = user.name || user.email;
    btn.textContent = I18N().t("nav_logout");
    tab.hidden = false;
  } else {
    pill.hidden = true;
    btn.textContent = I18N().t("nav_login");
    tab.hidden = true;
  }
}

function sourceTip(item) {
  if (!item?.source_url) return "";
  const date = item.checked_at || "";
  return `<a class="src" href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener" title="${escapeHtml(I18N().t("source_checked_at", { date }))}">ⓘ</a>`;
}

function deadlineBadge(d) {
  if (!d?.date_to) return `<span class="badge badge--gone">${I18N().t("no_data")}</span>`;
  const days = Math.ceil((Date.parse(d.date_to) - Date.now()) / 86400000);
  if (days < 0) return `<span class="badge badge--gone">${I18N().t("deadline_passed")}</span>`;
  if (days < 7) return `<span class="badge badge--err">${escapeHtml(d.date_to)}</span>`;
  if (days <= 30) return `<span class="badge badge--warn">${escapeHtml(d.date_to)}</span>`;
  return `<span class="badge badge--ok">${escapeHtml(d.date_to)}</span>`;
}

/* ---------- views ---------- */
function viewLanding() {
  const t = I18N();
  const c = Cat().counts();
  return `
    <section class="hero wrap">
      <p class="muted">${escapeHtml(t.t("for_whom"))}</p>
      <h1>${escapeHtml(t.t("hero_title"))}</h1>
      <p class="lead">${escapeHtml(t.t("hero_lead"))}</p>
      <div class="hero-actions">
        <a class="btn btn--primary" href="#/auth">${escapeHtml(t.t("hero_cta"))}</a>
        <a class="btn btn--ghost" href="#how">${escapeHtml(t.t("hero_how"))}</a>
      </div>
      <div class="stats">
        <div class="stat"><strong>${c.unis}</strong><span>${escapeHtml(t.t("nav_unis"))}</span></div>
        <div class="stat"><strong>${c.programs}</strong><span>${escapeHtml(t.t("stat_programs"))}</span></div>
        <div class="stat"><strong>${c.scholarships}</strong><span>${escapeHtml(t.t("stat_grants"))}</span></div>
        <div class="stat"><strong>${c.docs}</strong><span>${escapeHtml(t.t("uni_docs"))}</span></div>
      </div>
    </section>
    <section class="wrap grid-3" id="how">
      <article class="card"><h3>1. ${escapeHtml(t.t("step_1"))}</h3><p class="muted">${escapeHtml(t.t("step_1s"))}</p></article>
      <article class="card"><h3>2. ${escapeHtml(t.t("step_2"))}</h3><p class="muted">${escapeHtml(t.t("step_2s"))}</p></article>
      <article class="card"><h3>3. ${escapeHtml(t.t("step_3"))}</h3><p class="muted">${escapeHtml(t.t("step_3s"))}</p></article>
    </section>
    <p class="disclaimer wrap">${escapeHtml(t.t("trust"))}<br/><br/>${escapeHtml(t.t("disclaimer_not_agent"))}</p>
  `;
}

function viewAuth(route) {
  const t = I18N();
  const pending = Auth().peekPending();
  const mode = route.q.tab === "login" ? "login" : "register";
  if (pending && pending.expires > Date.now()) {
    return `
      <div class="card auth-card">
        <h1>${escapeHtml(t.t("gate_code"))}</h1>
        <p class="muted" id="otpHint">${escapeHtml(t.t("gate_demo_hint"))}</p>
        <p class="otp-demo" id="otpDemo" ${pending.demo && pending.code ? "" : "hidden"}>${pending.demo && pending.code ? escapeHtml(pending.code) : ""}</p>
        <form id="otpForm">
          <div class="otp-row" id="otpRow">
            ${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" data-i="${i}" autocomplete="${i ? "off" : "one-time-code"}" />`).join("")}
          </div>
          <button class="btn btn--primary" type="submit" style="width:100%">${escapeHtml(t.t("gate_verify"))}</button>
        </form>
        <button class="btn btn--ghost" type="button" id="changeEmail">${escapeHtml(t.t("auth_change_email"))}</button>
        <p class="form-note" id="gateMsg"></p>
      </div>`;
  }
  return `
    <div class="card auth-card">
      <div class="tabs">
        <button type="button" class="${mode === "register" ? "active" : ""}" data-go="#/auth">${escapeHtml(t.t("gate_title_reg"))}</button>
        <button type="button" class="${mode === "login" ? "active" : ""}" data-go="#/auth?tab=login">${escapeHtml(t.t("gate_title_login"))}</button>
      </div>
      <h1>${escapeHtml(mode === "login" ? t.t("gate_title_login") : t.t("gate_title_reg"))}</h1>
      <form id="${mode === "login" ? "loginForm" : "registerForm"}">
        ${
          mode === "register"
            ? `<label>${escapeHtml(t.t("gate_name"))}<input name="name" required autocomplete="name" /></label>`
            : ""
        }
        <label>${escapeHtml(t.t("gate_email"))}<input name="email" type="email" required autocomplete="email" /></label>
        ${
          mode === "register"
            ? `<label>${escapeHtml(t.t("gate_country"))}
                <select name="country">
                  <option value="TJ">${escapeHtml(t.t("gate_country_tj"))}</option>
                  <option value="RU">${escapeHtml(t.t("gate_country_ru"))}</option>
                  <option value="OTHER">${escapeHtml(t.t("gate_country_other"))}</option>
                </select></label>
                <label class="checkline"><input type="checkbox" name="consentPd" required /><span>${escapeHtml(t.t("consent_pd"))} — <a href="legal/privacy-consent.html" target="_blank">${escapeHtml(t.t("consent_pd_link"))}</a></span></label>
                <label class="checkline"><input type="checkbox" name="consentAge" required /><span>${escapeHtml(t.t("consent_age"))} — <a href="legal/age-consent.html" target="_blank">${escapeHtml(t.t("consent_age_link"))}</a></span></label>
                <label class="checkline"><input type="checkbox" name="consentTerms" required /><span>${escapeHtml(t.t("consent_terms"))} — <a href="legal/terms.html" target="_blank">${escapeHtml(t.t("consent_terms_link"))}</a></span></label>`
            : ""
        }
        <div id="turnstileBox" data-action="${mode === "login" ? "login" : "signup"}"></div>
        <button class="btn btn--primary" type="submit" style="width:100%;margin-top:12px">${escapeHtml(t.t("gate_send_code"))}</button>
      </form>
      <p class="form-note" id="gateMsg"></p>
    </div>`;
}

function viewCatalog(route) {
  const t = I18N();
  const q = route.q;
  const list = Cat().filter(q);
  const sort = q.sort || "price";
  list.sort((a, b) => {
    if (sort === "name") return loc(a.name).localeCompare(loc(b.name), t.lang);
    if (sort === "qs") return (a.rank_qs || 9999) - (b.rank_qs || 9999);
    const pa = a._price;
    const pb = b._price;
    if (pa == null) return 1;
    if (pb == null) return -1;
    return pa - pb;
  });
  const cities = (Cat().data().cities || []).slice().sort((a, b) => loc(a.name).localeCompare(loc(b.name), t.lang));
  const discs = Cat().data().disciplines || [];
  const chip = (key, val, label) => {
    const cur = (q[key] || "").split(",").filter(Boolean);
    const on = cur.includes(val);
    return `<button type="button" class="chip ${on ? "chip--active" : ""}" data-fk="${key}" data-fv="${val}">${escapeHtml(label)}</button>`;
  };

  return `
    <div class="wrap" style="padding-top:28px">
      <h1>${escapeHtml(t.t("unis_title"))}</h1>
      <p class="muted">${escapeHtml(t.t("showing"))}: ${list.length}</p>
      <input class="search" id="uniSearch" value="${escapeHtml(q.q || "")}" placeholder="ZJU, Beijing, business…" />
    </div>
    <div class="wrap catalog-layout">
      <aside class="filters">
        <fieldset><legend>${escapeHtml(t.t("filter_degree"))}</legend>
          <div class="chips">${chip("degree", "language", t.t("degree_language"))}${chip("degree", "bachelor", t.t("degree_bachelor"))}${chip("degree", "master", t.t("degree_master"))}</div>
        </fieldset>
        <fieldset><legend>${escapeHtml(t.t("filter_lang"))}</legend>
          <div class="chips">${chip("lang", "en", t.t("lang_en"))}${chip("lang", "zh", t.t("lang_zh"))}</div>
        </fieldset>
        <fieldset><legend>${escapeHtml(t.t("filter_city"))}</legend>
          <select class="search" id="citySel" style="height:40px">
            <option value="">—</option>
            ${cities.map((c) => `<option value="${c.id}" ${q.city === c.id ? "selected" : ""}>${escapeHtml(loc(c.name))}</option>`).join("")}
          </select>
        </fieldset>
        <fieldset><legend>${escapeHtml(t.t("filter_disc"))}</legend>
          <div class="chips">${discs.map((d) => chip("disc", d.id, loc(d.name))).join("")}</div>
        </fieldset>
        <fieldset><legend>${escapeHtml(t.t("filter_price"))}</legend>
          <input type="range" id="priceMax" min="0" max="15000" step="500" value="${escapeHtml(q.price_max || "15000")}" />
          <p class="muted">≤ $${escapeHtml(q.price_max || "15000")}</p>
        </fieldset>
        <fieldset>
          <label class="checkline"><input type="checkbox" id="fltSch" ${q.sch === "1" ? "checked" : ""}/> ${escapeHtml(t.t("filter_sch"))}</label>
          <label class="checkline"><input type="checkbox" id="fltHsk" ${q.no_hsk === "1" ? "checked" : ""}/> ${escapeHtml(t.t("filter_no_hsk"))}</label>
          <label class="checkline"><input type="checkbox" id="fltTest" ${q.fits_test === "1" ? "checked" : ""}/> ${escapeHtml(t.t("filter_fits"))}</label>
        </fieldset>
        <fieldset><legend>${escapeHtml(t.t("filter_tier"))}</legend>
          <div class="chips">${["c9", "985", "211", "provincial", "sino_foreign"].map((x) => chip("tier", x, x.toUpperCase())).join("")}</div>
        </fieldset>
        <button class="btn btn--tiny btn--ghost" type="button" id="fltReset">${escapeHtml(t.t("filter_reset"))}</button>
      </aside>
      <div>
        <label class="muted">${escapeHtml(t.t("uni_sort"))}
          <select id="uniSort">
            <option value="price" ${sort === "price" ? "selected" : ""}>${escapeHtml(t.t("sort_price"))}</option>
            <option value="qs" ${sort === "qs" ? "selected" : ""}>${escapeHtml(t.t("sort_qs"))}</option>
            <option value="name" ${sort === "name" ? "selected" : ""}>${escapeHtml(t.t("sort_name"))}</option>
          </select>
        </label>
        <div class="uni-grid" style="margin-top:16px">
          ${
            list.length
              ? list
                  .map((u) => {
                    const city = Cat().city(u.city_id);
                    const inPath = Path().hasUni(u.id);
                    return `<a class="card uni-card" href="#/uni/${u.id}">
                      <div class="ph"><img src="assets/brand/mark.svg" alt="" width="72" height="28" /></div>
                      <div>${(u.scholarship_ids || []).length ? `<span class="tag">CSC</span>` : ""} <span class="tag">${escapeHtml(u.tier)}</span></div>
                      <h3>${escapeHtml(loc(u.name))}</h3>
                      <p class="muted">${escapeHtml(loc(city?.name))} · ${escapeHtml(money(u._price))}</p>
                      <span class="btn btn--tiny ${inPath ? "btn--primary" : "btn--secondary"}" data-add="${u.id}">${escapeHtml(t.t(inPath ? "uni_in_path" : "uni_add_path"))}</span>
                    </a>`;
                  })
                  .join("")
              : `<div class="empty">${escapeHtml(t.t("empty_filters"))}</div>`
          }
        </div>
      </div>
    </div>`;
}

function viewUni(id) {
  const t = I18N();
  const u = Cat().uni(id);
  if (!u) return `<div class="wrap empty">404</div>`;
  const city = Cat().city(u.city_id);
  const progs = Cat().programsOf(u);
  const inPath = Path().hasUni(u.id);
  const path = Path().get();
  const selectedSch = path.unis.find((x) => x.uni_id === id)?.scholarship_ids || [];

  const tiles = [
    [t.t("uni_from_year"), money(Cat().minTuition(u)), u],
    [t.t("uni_dorm"), u.dorm ? money(u.dorm.price_min) : t.t("no_data"), u],
    [t.t("uni_quota_intl"), u.quota_intl ?? t.t("no_data"), u],
    [t.t("uni_application"), money(u.application_fee), u],
  ];

  return `
    <div class="wrap uni-hero">
      <div>
        <a href="#/unis">${escapeHtml(t.t("uni_back"))}</a>
        <div>${escapeHtml(u.tier.toUpperCase())} ${u.rank_qs ? "· QS " + u.rank_qs : ""}</div>
        <h1>${escapeHtml(loc(u.name))}</h1>
        <p class="muted">${escapeHtml(loc(city?.name))} · ${escapeHtml(loc(city?.province))}</p>
        <p>${escapeHtml(loc(u.blurb))}</p>
        <div class="hero-actions" style="justify-content:flex-start;margin-top:16px">
          <button class="btn ${inPath ? "btn--primary" : "btn--secondary"}" type="button" data-add="${u.id}">${escapeHtml(t.t(inPath ? "uni_in_path" : "uni_add_path"))}</button>
          ${u.links?.official ? `<a class="btn btn--ghost" href="${escapeHtml(u.links.official)}" target="_blank" rel="noopener">${escapeHtml(t.t("uni_portal"))}</a>` : ""}
          ${u.links?.apply ? `<a class="btn btn--ghost" href="${escapeHtml(u.links.apply)}" target="_blank" rel="noopener">${escapeHtml(t.t("uni_apply"))}</a>` : ""}
        </div>
      </div>
      ${window.BRIDGE_MAP.inline({ city })}
    </div>
    <div class="wrap tiles">
      ${tiles
        .map(
          ([k, v, src]) =>
            `<div class="tile"><label>${escapeHtml(k)} ${sourceTip(src)}</label><strong>${escapeHtml(String(v))}</strong></div>`
        )
        .join("")}
    </div>
    <div class="wrap">
      <h2>${escapeHtml(t.t("uni_en_programs"))}</h2>
      <table class="prog-table">
        <thead><tr><th>${escapeHtml(t.t("uni_majors"))}</th><th>${escapeHtml(t.t("filter_degree"))}</th><th>${escapeHtml(t.t("uni_tuition"))}</th><th>${escapeHtml(t.t("filter_intake"))}</th></tr></thead>
        <tbody>
          ${progs
            .map(
              (p) =>
                `<tr><td>${escapeHtml(loc(p.name))}</td><td>${escapeHtml(t.t("degree_" + p.degree) || p.degree)}</td><td>${escapeHtml(money(p.tuition_year))} ${sourceTip(p)}</td><td>${escapeHtml(t.t("intake_" + p.intake) || p.intake)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>

      <h2 style="margin-top:32px">${escapeHtml(t.t("uni_quota"))}</h2>
      <div class="grid-3">
        ${(u.scholarship_ids || [])
          .map((sid) => {
            const s = Cat().scholarship(sid);
            if (!s) return "";
            const on = selectedSch.includes(sid);
            return `<article class="card">
              <h3><button type="button" class="btn btn--ghost" data-sch="${s.id}" style="padding:0;height:auto">${escapeHtml(loc(s.name))}</button></h3>
              <p class="muted">${escapeHtml(s.coverage?.tuition_pct ?? "—")}% · ${s.coverage?.dorm ? t.t("sch_coverage_dorm") : ""} ${sourceTip(s)}</p>
              <button class="btn btn--tiny ${on ? "btn--primary" : "btn--secondary"}" type="button" data-togglesch="${u.id}:${s.id}">${escapeHtml(t.t("sch_select"))}</button>
            </article>`;
          })
          .join("") || `<p class="muted">${escapeHtml(t.t("no_data"))}</p>`}
      </div>

      <h2 style="margin-top:32px">${escapeHtml(t.t("uni_docs"))}</h2>
      <p class="muted">${escapeHtml(t.t("doc_click_hint"))}</p>
      <div class="chips" style="margin:12px 0 32px">
        ${(u.document_ids || [])
          .map((id) => {
            const d = Cat().document(id);
            return `<button type="button" class="chip doc-chip" data-doc="${id}">${escapeHtml(loc(d?.name) || id)}</button>`;
          })
          .join("")}
      </div>

      <h2>${escapeHtml(t.t("check_title"))}</h2>
      <div class="timeline">
        ${(u.deadline_ids || [])
          .map((id) => Cat().deadline(id))
          .filter(Boolean)
          .map(
            (d) =>
              `<div class="tl-item">${deadlineBadge(d)} <strong>${escapeHtml(loc(d.label))}</strong> ${sourceTip(d)}
               ${d.note ? `<p class="muted">${escapeHtml(loc(d.note))}</p>` : ""}</div>`
          )
          .join("")}
      </div>
      <p class="muted">${escapeHtml(t.t("disclaimer_not_agent"))}</p>
      <p><a href="mailto:?subject=${encodeURIComponent("[BRIDGE] uni:" + u.id)}">${escapeHtml(t.t("report_error"))}</a></p>
    </div>
  `;
}

function viewPath() {
  const t = I18N();
  const p = Path().get();
  const pct = Path().progress(p);
  if (!p.unis.length) {
    return `<div class="wrap empty"><h1>${escapeHtml(t.t("path_title"))}</h1><p>${escapeHtml(t.t("path_empty"))}</p><a class="btn btn--primary" href="#/unis">${escapeHtml(t.t("nav_unis"))}</a></div>`;
  }
  const docs = Path().documents(p);
  const deadlines = [];
  p.unis.forEach((row) => {
    const u = Cat().uni(row.uni_id);
    (u?.deadline_ids || []).forEach((id) => {
      const d = Cat().deadline(id);
      if (d) deadlines.push({ d, u });
    });
  });
  deadlines.sort((a, b) => String(a.d.date_to).localeCompare(String(b.d.date_to)));

  return `
    <div class="wrap path-head">
      <div>
        <h1>${escapeHtml(t.t("path_title"))}</h1>
        <p class="muted">${escapeHtml(t.t("path_local"))}</p>
      </div>
      <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
    </div>
    <div class="wrap">
      <h2>${escapeHtml(t.t("path_this_week"))}</h2>
      <div>
        ${deadlines
          .slice(0, 5)
          .map(
            ({ d, u }) =>
              `<div class="check-row">${deadlineBadge(d)}<div><strong>${escapeHtml(loc(d.label))}</strong><p class="muted">${escapeHtml(loc(u.name))}</p></div></div>`
          )
          .join("") || `<p class="muted">${escapeHtml(t.t("no_data"))}</p>`}
      </div>
      <h2>${escapeHtml(t.t("path_unis"))}</h2>
      ${p.unis
        .map((row) => {
          const u = Cat().uni(row.uni_id);
          if (!u) return `<div class="card">${escapeHtml(row.uni_id)}</div>`;
          const applied = Path().taskDone(`uni:${u.id}:apply`);
          return `<article class="card" style="margin-bottom:12px">
            <h3><a href="#/uni/${u.id}">${escapeHtml(loc(u.name))}</a></h3>
            <p>${(row.scholarship_ids || []).map((id) => `<span class="tag">${escapeHtml(loc(Cat().scholarship(id)?.name) || id)}</span>`).join(" ")}</p>
            <button class="btn btn--tiny ${applied ? "btn--primary" : "btn--secondary"}" data-task="uni:${u.id}:apply">${escapeHtml(t.t("path_apply"))}</button>
            <button class="btn btn--tiny btn--ghost" data-remove="${u.id}">${escapeHtml(t.t("path_remove"))}</button>
          </article>`;
        })
        .join("")}
      <h2>${escapeHtml(t.t("path_docs"))}</h2>
      ${docs
        .map((row) => {
          const on = Path().taskDone(`doc:${row.id}`);
          return `<label class="check-row">
            <input type="checkbox" data-task="doc:${row.id}" ${on ? "checked" : ""} />
            <div>
              <strong><button type="button" class="btn btn--ghost" data-doc="${row.id}" style="padding:0;height:auto">${escapeHtml(loc(row.doc.name))}</button></strong>
              <p class="muted">${escapeHtml(t.t("path_needed_for"))}: ${escapeHtml(row.owners.join(", "))}</p>
            </div>
          </label>`;
        })
        .join("")}
      <p class="disclaimer">${escapeHtml(t.t("disclaimer_not_agent"))}</p>
    </div>`;
}

function viewSupport() {
  const t = I18N();
  const s = Cat().data()?.support || {};
  const yo = s.yoomoney_url;
  const yoNum = s.yoomoney_wallet;
  const usdt = s.usdt_address || s.usdt_trc20;
  const net = s.usdt_network || "TON";
  if (!yo && !usdt) {
    return `<div class="wrap" style="padding:48px 0"><h1>${escapeHtml(t.t("support_title"))}</h1><div class="card"><p>${escapeHtml(t.t("support_soon"))}</p></div></div>`;
  }
  return `
    <div class="wrap" style="padding:48px 0">
      <h1>${escapeHtml(t.t("support_title"))}</h1>
      <p class="lead muted">${escapeHtml(t.t("support_lead"))}</p>
      <div class="grid-3" style="margin-top:28px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        ${
          yo
            ? `<article class="card donate-card">
                <h3>ЮMoney</h3>
                <img class="qr" src="assets/brand/qr-yoomoney.svg" alt="QR YooMoney" width="160" height="160" />
                <p><code>${escapeHtml(yoNum || yo)}</code></p>
                <div class="hero-actions" style="justify-content:flex-start">
                  <a class="btn btn--primary" href="${escapeHtml(yo)}" target="_blank" rel="noopener">${escapeHtml(t.t("support_open_yo"))}</a>
                  <button class="btn btn--secondary" type="button" data-copy="${escapeHtml(yoNum || yo)}">${escapeHtml(t.t("support_copy"))}</button>
                </div>
              </article>`
            : ""
        }
        ${
          usdt
            ? `<article class="card donate-card">
                <h3>USDT · ${escapeHtml(net)}</h3>
                <p class="muted">${escapeHtml(t.t("support_usdt_note"))}</p>
                <img class="qr" src="assets/brand/qr-usdt-ton.svg" alt="QR USDT TON" width="160" height="160" />
                <p><code class="addr">${escapeHtml(usdt)}</code></p>
                <button class="btn btn--primary" type="button" data-copy="${escapeHtml(usdt)}">${escapeHtml(t.t("support_copy"))}</button>
              </article>`
            : ""
        }
      </div>
    </div>`;
}

function viewTest() {
  const t = I18N();
  return `
    <div class="wrap" style="padding:32px 0">
      <h1>${escapeHtml(t.t("test_title"))}</h1>
      <p class="muted">${escapeHtml(t.t("test_lead"))}</p>
      <div class="card" style="margin-top:16px">
        <div id="testWizard"></div>
        <div id="testResult" hidden></div>
      </div>
    </div>`;
}

function openSheet(html) {
  const root = document.getElementById("sheet");
  document.getElementById("sheetBody").innerHTML = html + `<p><button class="btn btn--tiny btn--ghost" data-close-sheet>${escapeHtml(I18N().t("doc_close"))}</button></p>`;
  root.hidden = false;
}

function closeSheet() {
  document.getElementById("sheet").hidden = true;
}

function sheetScholarship(id) {
  const t = I18N();
  const s = Cat().scholarship(id);
  if (!s) return;
  const country = Auth().currentUser()?.country || "TJ";
  const how = s.how_to_apply?.[country] || s.how_to_apply?.all;
  openSheet(`
    <h2>${escapeHtml(loc(s.name))}</h2>
    <p class="muted">${escapeHtml(loc(s.provider))} ${sourceTip(s)}</p>
    <p>${escapeHtml(t.t("sch_coverage_tuition"))}: ${s.coverage?.tuition_pct ?? t.t("no_data")}% ·
       ${escapeHtml(t.t("sch_coverage_stipend"))}: ${s.coverage?.stipend_month != null ? money(s.coverage.stipend_month) : t.t("no_data")}</p>
    ${s.coverage?.stipend_note ? `<p class="muted">${escapeHtml(loc(s.coverage.stipend_note))}</p>` : ""}
    <h3>${escapeHtml(t.t("sch_req"))}</h3>
    <ul>${(s.requirements || []).map((r) => `<li>${escapeHtml(loc(r.text))}${r.document_id ? ` · <button type="button" data-doc="${r.document_id}" class="btn btn--ghost" style="height:auto;padding:0">${escapeHtml(loc(Cat().document(r.document_id)?.name) || "")}</button>` : ""}</li>`).join("")}</ul>
    <div class="tabs">
      <button type="button" class="${country === "TJ" ? "active" : ""}" data-how="TJ">TJ</button>
      <button type="button" class="${country === "RU" ? "active" : ""}" data-how="RU">RU</button>
    </div>
    <div id="howBox"><p>${escapeHtml(loc(how))}</p></div>
    ${s.apply_url ? `<p><a class="btn btn--primary" href="${escapeHtml(s.apply_url)}" target="_blank" rel="noopener">${escapeHtml(t.t("uni_apply"))}</a></p>` : ""}
  `);
  document.querySelectorAll("[data-how]").forEach((b) => {
    b.addEventListener("click", () => {
      const h = s.how_to_apply?.[b.dataset.how] || s.how_to_apply?.all;
      document.getElementById("howBox").innerHTML = `<p>${escapeHtml(loc(h))}</p>`;
      document.querySelectorAll("[data-how]").forEach((x) => x.classList.toggle("active", x === b));
    });
  });
}

function sheetDoc(id) {
  const t = I18N();
  const d = Cat().document(id);
  if (!d) return;
  const country = Auth().currentUser()?.country || "TJ";
  const how = d.how_to_get?.[country] || d.how_to_get?.all || d.how_to_get;
  openSheet(`
    <h2>${escapeHtml(loc(d.name))}</h2>
    <p>${sourceTip(d)}</p>
    <h3>${escapeHtml(t.t("doc_what"))}</h3>
    <p>${escapeHtml(loc(d.what))}</p>
    <h3>${escapeHtml(t.t("doc_how"))}</h3>
    <div class="tabs">
      <button type="button" class="${country === "TJ" ? "active" : ""}" data-how="TJ">TJ</button>
      <button type="button" class="${country === "RU" ? "active" : ""}" data-how="RU">RU</button>
    </div>
    <div id="howBox"><p>${escapeHtml(typeof how === "object" ? loc(how) : how)}</p></div>
    <p class="muted">
      ${d.needs_translation ? t.t("doc_needs_translation") + " · " : ""}
      ${d.needs_notary ? t.t("doc_needs_notary") + " · " : ""}
      ${d.needs_apostille ? t.t("doc_needs_apostille") : ""}
    </p>
  `);
  document.querySelectorAll("[data-how]").forEach((b) => {
    b.addEventListener("click", () => {
      const h = d.how_to_get?.[b.dataset.how] || d.how_to_get?.all;
      document.getElementById("howBox").innerHTML = `<p>${escapeHtml(loc(h))}</p>`;
      document.querySelectorAll("[data-how]").forEach((x) => x.classList.toggle("active", x === b));
    });
  });
}

/* ---------- test (kept) ---------- */
let designPromise;
function getDesign() {
  if (!designPromise) designPromise = window.BRIDGE_TEST.loadDesign();
  return designPromise;
}

async function startTest() {
  const design = await getDesign();
  const wizard = document.getElementById("testWizard");
  const resultBox = document.getElementById("testResult");
  if (!wizard) return;
  resultBox.hidden = true;
  wizard.hidden = false;
  const questions = design.questions;
  let step = 0;
  const answers = JSON.parse(sessionStorage.getItem("bridge-test-draft") || "{}");
  if (Object.keys(answers).length) {
    step = questions.findIndex((q) => answers[q.id] == null);
    if (step < 0) step = questions.length;
  }
  const t = I18N();
  function draw() {
    if (step >= questions.length) return finishTest(design, answers);
    const q = questions[step];
    let optionsHtml = "";
    if (q.format === "likert5") {
      optionsHtml = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="test-opt" data-v="${n}">${n}. ${t.t("likert_" + n)}</button>`).join("");
    } else if (q.format === "forced4") {
      optionsHtml = (q.options || []).map((o) => `<button type="button" class="test-opt" data-v="${o.id || o.k}">${escapeHtml(o.text || o.t)}</button>`).join("");
    } else {
      optionsHtml = `<div class="pick-grid">${(q.options || []).map((o) => `<label class="pick-opt"><input type="checkbox" value="${o.id || o.k}" /><span>${escapeHtml(o.text || o.t)}</span></label>`).join("")}</div>
        <button type="button" class="btn btn--primary" id="pickNext">${t.t("pick_next")}</button>`;
    }
    const text = typeof q.text === "object" ? loc(q.text) : q.text;
    wizard.innerHTML = `<div class="test-progress">${t.t("test_progress", { n: step + 1, total: questions.length })}</div><h3>${escapeHtml(text)}</h3><div class="test-options">${optionsHtml}</div>`;
    if (q.format === "pick2of4") {
      const boxes = [...wizard.querySelectorAll("input[type=checkbox]")];
      boxes.forEach((box) => box.addEventListener("change", () => {
        if (boxes.filter((b) => b.checked).length > 2) box.checked = false;
      }));
      wizard.querySelector("#pickNext").addEventListener("click", () => {
        const picks = boxes.filter((b) => b.checked).map((i) => i.value).slice(0, 2);
        if (!picks.length) return;
        answers[q.id] = picks;
        sessionStorage.setItem("bridge-test-draft", JSON.stringify(answers));
        step += 1;
        draw();
      });
    } else {
      wizard.querySelectorAll(".test-opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          answers[q.id] = btn.dataset.v;
          sessionStorage.setItem("bridge-test-draft", JSON.stringify(answers));
          step += 1;
          draw();
        });
      });
    }
  }
  draw();
}

function finishTest(design, answers) {
  const result = window.BRIDGE_TEST.buildResult(design, answers);
  Auth().saveUserResult(result);
  try {
    localStorage.setItem("bridge-test-result-v1", JSON.stringify({ scores: result.dims, topClusters: (result.rankedClusters || []).slice(0, 3).map((c) => c.id), created_at: result.at }));
  } catch { /* ignore */ }
  sessionStorage.removeItem("bridge-test-draft");
  document.getElementById("testWizard").hidden = true;
  document.getElementById("testResult").hidden = false;
  renderTestResult(result);
}

function renderTestResult(result) {
  const t = I18N();
  const box = document.getElementById("testResult");
  const unis = (result.uniIds || []).map((id) => Cat().uni(id)).filter(Boolean);
  box.innerHTML = `
    <div><h3>${escapeHtml(t.t("result_title"))}</h3><p>${escapeHtml(result.summary)}</p></div>
    <div class="cluster-pills">${(result.rankedClusters || []).map((c) => `<span class="pill">${escapeHtml(c.label)}</span>`).join("")}</div>
    <ul>${(result.professions || []).map((p) => `<li>${escapeHtml(p.name)}</li>`).join("")}</ul>
    <div>${unis.map((u) => `<a class="card" href="#/uni/${u.id}" style="display:block;margin:8px 0">${escapeHtml(loc(u.name))}</a>`).join("")}</div>
    <a class="btn btn--primary" href="#/unis?fits_test=1">${escapeHtml(t.t("result_see_unis"))}</a>
    <button class="btn btn--ghost" type="button" id="retakeTest">${escapeHtml(t.t("result_retake"))}</button>
    <p class="muted">${escapeHtml(t.t("result_disclaimer"))}</p>`;
  document.getElementById("retakeTest")?.addEventListener("click", async () => {
    Auth().saveUserResult(null);
    await startTest();
  });
}

/* ---------- events / route ---------- */
function bindView(route) {
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.go; }));
  document.querySelectorAll("[data-add]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = Path().addUni(b.dataset.add);
      if (r._limit) return toast(I18N().t("path_limit"));
      toast(I18N().t("toast_added"));
      routeNow();
    });
  });
  document.querySelectorAll("[data-remove]").forEach((b) => {
    b.addEventListener("click", () => {
      Path().removeUni(b.dataset.remove);
      routeNow();
    });
  });
  document.querySelectorAll("[data-togglesch]").forEach((b) => {
    b.addEventListener("click", () => {
      const [uni, sch] = b.dataset.togglesch.split(":");
      const r = Path().toggleSch(uni, sch);
      if (r._limit) toast(I18N().t("path_limit"));
      else toast(I18N().t("toast_added"));
      routeNow();
    });
  });
  document.querySelectorAll("[data-sch]").forEach((b) => b.addEventListener("click", () => sheetScholarship(b.dataset.sch)));
  document.querySelectorAll("[data-doc]").forEach((b) => b.addEventListener("click", () => sheetDoc(b.dataset.doc)));
  document.querySelectorAll("[data-task]").forEach((b) => {
    b.addEventListener("click", (e) => {
      if (b.type === "checkbox") e.stopPropagation();
      Path().toggleTask(b.dataset.task);
      if (b.tagName === "BUTTON") routeNow();
    });
  });
  document.querySelectorAll("[data-close-sheet]").forEach((el) => el.addEventListener("click", closeSheet));
  document.querySelectorAll("[data-copy]").forEach((b) => {
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        toast(I18N().t("support_copied"));
      } catch {
        toast(b.dataset.copy);
      }
    });
  });
  document.querySelectorAll("[data-fk]").forEach((b) => {
    b.addEventListener("click", () => {
      const q = { ...parseHash().q };
      const cur = new Set((q[b.dataset.fk] || "").split(",").filter(Boolean));
      if (cur.has(b.dataset.fv)) cur.delete(b.dataset.fv);
      else cur.add(b.dataset.fv);
      q[b.dataset.fk] = [...cur].join(",");
      setQuery(q);
    });
  });
  document.getElementById("citySel")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, city: e.target.value }));
  document.getElementById("uniSort")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, sort: e.target.value }));
  document.getElementById("priceMax")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, price_max: e.target.value }));
  document.getElementById("fltSch")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, sch: e.target.checked ? "1" : "" }));
  document.getElementById("fltHsk")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, no_hsk: e.target.checked ? "1" : "" }));
  document.getElementById("fltTest")?.addEventListener("change", (e) => setQuery({ ...parseHash().q, fits_test: e.target.checked ? "1" : "" }));
  document.getElementById("fltReset")?.addEventListener("click", () => { location.hash = "#/unis"; });
  let st;
  document.getElementById("uniSearch")?.addEventListener("input", (e) => {
    clearTimeout(st);
    st = setTimeout(() => setQuery({ ...parseHash().q, q: e.target.value }), 200);
  });

  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const otpForm = document.getElementById("otpForm");
  const gateMsg = document.getElementById("gateMsg");
  mountAuthTurnstile();
  async function send(mode, form) {
    const fd = new FormData(form);
    const token = authWidgetId !== undefined && window.turnstile ? window.turnstile.getResponse(authWidgetId) || "" : "";
    try {
      if (!isLocalDemoHost() && !token) throw new Error("captcha");
      await Auth().requestOtp({
        email: fd.get("email"),
        name: fd.get("name"),
        country: fd.get("country") || "TJ",
        mode,
        consents: mode === "register" ? { pd: fd.get("consentPd"), age: fd.get("consentAge"), terms: fd.get("consentTerms") } : null,
        turnstileToken: token,
      });
      routeNow();
    } catch (err) {
      gateMsg.textContent = authErrorText(err.message);
    } finally {
      if (authWidgetId !== undefined && window.turnstile && document.getElementById("turnstileBox")) {
        try {
          window.turnstile.reset(authWidgetId);
        } catch {
          /* widget already removed */
        }
      }
    }
  }
  registerForm?.addEventListener("submit", (e) => { e.preventDefault(); send("register", registerForm); });
  loginForm?.addEventListener("submit", (e) => { e.preventDefault(); send("login", loginForm); });
  if (otpForm) {
    const inputs = [...otpForm.querySelectorAll("input")];
    inputs.forEach((inp, i) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(-1);
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener("paste", (e) => {
        const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
        txt.split("").forEach((ch, j) => { if (inputs[j]) inputs[j].value = ch; });
        e.preventDefault();
      });
    });
    otpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = inputs.map((i) => i.value).join("");
      try {
        await Auth().verifyOtp(code);
        const next = parseHash().q.next || "/unis";
        location.hash = `#${next.startsWith("/") ? next : "/" + next}`;
      } catch (err) {
        gateMsg.textContent = authErrorText(err.message);
      }
    });
    document.getElementById("changeEmail")?.addEventListener("click", () => {
      localStorage.removeItem("bridge-otp-pending");
      routeNow();
    });
  }
}

async function routeNow() {
  const r = parseHash();
  const authed = Auth().isAuthed();
  const protectedViews = new Set(["unis", "uni", "test", "path"]);
  if (!authed && protectedViews.has(r.view)) {
    location.hash = `#/auth?next=${encodeURIComponent(location.hash.replace(/^#/, "") || "/unis")}`;
    return;
  }
  if (authed && r.view === "home") {
    location.hash = "#/unis";
    return;
  }
  const app = document.getElementById("app");
  if (r.view === "home") app.innerHTML = viewLanding();
  else if (r.view === "auth") app.innerHTML = viewAuth(r);
  else if (r.view === "unis") app.innerHTML = viewCatalog(r);
  else if (r.view === "uni") app.innerHTML = viewUni(r.id);
  else if (r.view === "path") app.innerHTML = viewPath();
  else if (r.view === "support") app.innerHTML = viewSupport();
  else if (r.view === "test") app.innerHTML = viewTest();
  applyI18n();
  refreshUserUI();
  document.querySelectorAll(".nav-links a, .tab-bar a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    a.classList.toggle("active", href === `#/${r.view}` || (r.view === "uni" && href === "#/unis"));
  });
  bindView(r);
  if (r.view === "test") {
    const user = Auth().currentUser();
    if (user?.result) {
      document.getElementById("testWizard").hidden = true;
      document.getElementById("testResult").hidden = false;
      renderTestResult(user.result);
    } else await startTest();
  }
  window.scrollTo(0, 0);
}

function setupAuthBtn() {
  document.getElementById("navAuthBtn").addEventListener("click", () => {
    if (Auth().isAuthed()) {
      Auth().logout();
      location.hash = "#/";
      routeNow();
    } else location.hash = "#/auth";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });
}

window.BRIDGE_APP = { toast, routeNow };

document.addEventListener("DOMContentLoaded", async () => {
  setupLang();
  setupAuthBtn();
  applyI18n();
  await Cat().load();
  await FX().refresh();
  window.addEventListener("hashchange", () => routeNow());
  window.addEventListener("bridge:auth", () => routeNow());
  routeNow();
});
