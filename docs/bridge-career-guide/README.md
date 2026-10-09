# BRIDGE — персональный гид поступления в Китай

Интерактивная презентация для абитуриента:

- профиль по тесту
- сильные / слабые стороны
- направления учёбы
- 8 вузов на английском
- живой чек-лист с прогрессом
- план на 12 месяцев

## Онлайн (бесплатный хост)

### 1) Cloudflare Workers (рекомендуется закрепить)

Живая ссылка:

https://bridge-career-guide.legendary-tarp.workers.dev

Чтобы сайт остался навсегда на бесплатном Cloudflare:

1. Открой claim-ссылку (действует ~60 минут после деплоя)
2. Войди / создай бесплатный аккаунт Cloudflare
3. Подтверди claim

После claim сайт останется на `*.workers.dev` бесплатно.

Деплой из этой папки:

```bash
cd docs/bridge-career-guide
npx wrangler@4.102.0 deploy --temporary
```

### 2) GitHub Pages (постоянно, бесплатно)

Ветка `gh-pages` уже опубликована с сайтом в корне.

Включи Pages в настройках репозитория:

1. GitHub → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **/** (root)
4. Save

Сайт будет примерно:

`https://sher018.github.io/-M-file/`

(точный URL покажет GitHub после включения)

## Локально

1. Открой `index.html` в браузере  
   или:

```bash
cd docs/bridge-career-guide
python3 -m http.server 8080
```

Чек-лист сохраняет отметки в браузере автоматически.
