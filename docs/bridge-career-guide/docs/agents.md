# Субагенты сборки BRIDGE

Спецификация — единственный источник правды. Субагенты не выдумывают факты каталога.

| Агент | Модель | Tools | Задача |
|-------|--------|-------|--------|
| catalog-architect | high | Read, Grep, Write (только `data/`, `scripts/`) | Схемы JSON, валидатор, бандл, миграции. Каждый факт — с `source_url`. |
| worker-engineer | high | Read, Grep, Write (`worker.js`, `wrangler.jsonc`) | `/api/*`, OTP, CORS, fx, feedback. Без секретов в git. |
| frontend-developer | medium | Read, Grep, Write (`*.html, *.css, app.js, i18n.js, catalog.js, path.js, map.js, auth.js`) | Экраны MVP по §2–12 спецификации, Apple-стиль, палитра бренда. |
| data-extractor | high | Read, WebFetch, Write (только ветка data/, PR) | Извлечение полей **только с цитатой** из официальной страницы. Температура 0. В `main` не пишет. |
| qa-reviewer | medium | Read, Grep, Glob, Bash (**без Write/Edit**) | Чеклист §20, контраст AA, escapeHtml, нет выдуманных фактов. Описывает проблемы, не чинит. |

Параллель: catalog-architect ∥ worker-engineer ∥ frontend-developer, затем qa-reviewer.
MCP: Cloudflare docs для Worker; каталог — только официальные домены вузов / CSC / посольств.
