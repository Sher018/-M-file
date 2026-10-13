# BRIDGE · To China

Гид по вузам Китая для абитуриентов из Таджикистана и России.
Документы: `PROJECT_IDEA.md` (слой 1) → `SPECIFICATION.md` (слой 2). Код без противоречия спецификации.

## Стек
Vanilla JS SPA + Cloudflare Worker (`worker.js`) + Static Assets. Деплой: `bridge-tj.lol`.
Данные: `data/*.json` → `catalog.bundle.json`. Пользовательский путь MVP: `localStorage`. D1 — v1.

## Жёсткие правила
- Факт каталога/гида без `source_url` + `checked_at` в прод не попадает. Не выдумывать цифры, дедлайны, требования.
- Пустое значение = `null` + UI `t('no_data')`.
- Валюта: хранить CNY, показывать CNY + USD.
- Имя бренда: **BRIDGE · To China**. Палитра: `#013220 #0B6E4F #50C878 #D1F2EB`. Логотип монохромный.
- Не агент: нет приёма заявок за студента, нет хранения сканов паспортов.
- Весь пользовательский HTML через `escapeHtml`. CSP в Worker.
- `CLAUDE.md` не раздувать: детали в `SPECIFICATION.md` и `.cursor/rules/`.

## Команды
```
node scripts/validate-data.mjs --offline
node scripts/build-bundle.mjs
npx wrangler deploy
```

## Модули MVP
Landing (гость) · Auth (6-значный OTP / Resend) · Catalog · University · Scholarships sheet · Documents sheet · «Мой путь в Китай» · Test · Support (ЮMoney/USDT).

## Запрещено
Писать в `main` каталог без PR. Менять покрытие гранта без цитаты источника. Белый текст на `#50C878`.
