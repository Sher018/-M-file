# BRIDGE — orientation & China universities

Interactive guide for students from Tajikistan / Russia choosing English-track study in China.

## Features

- **Auth gate** — register or sign in with a **4-digit email OTP** (demo mode shows the code on screen; wire `/api/send-otp` for real mail).
- **Consent links** — checkboxes link to full texts in `legal/` (privacy, age, terms).
- **Orientation test** — Gorisont-inspired short form (`career-orientation-test.design.json`): Big Five + DISC + values + motivation → career clusters and expanded professions.
- **University pages** — hash routes `#/uni/:id` with ranking, majors, tuition (**CNY / USD / TJS**), foreigner quotas, savings vs paid year, official site link.
- **i18n** — Russian, Tajik (`tg`), English.
- **Headline** — «Ориентация. Вузы Китая. Твой маршрут.» (site essence, not the old engineering line).

## Data sources

- Universities expanded from public guides including [chinacampus.ru](https://chinacampus.ru/) and official portals — always verify fees/quotas on the university site.
- Test design inspired by layers used at [gorisont.com](https://gorisont.com/) (short form, not clinical).

## Files

| File | Role |
|------|------|
| `index.html` | Shell + auth gate |
| `app.js` | Router, UI, checklist |
| `auth.js` | OTP auth (localStorage MVP) |
| `i18n.js` | RU / TG / EN |
| `test-engine.js` | Scoring |
| `professions.js` | Expanded careers by cluster |
| `data-universities.js` | University database |
| `fx.js` | CNY → USD / TJS |
| `career-orientation-test.design.json` | Test spec |
| `legal/` | Full consent pages |

## Local preview

```bash
cd docs/bridge-career-guide
python3 -m http.server 8787
# open http://127.0.0.1:8787/
```

## Deploy

Cloudflare Workers static assets: `wrangler.jsonc` in this folder. Temporary `workers.dev` may block some mobile browsers (Turnstile); prefer a custom domain or trycloudflare for demos.
