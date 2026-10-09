# Письма с кодом: что сделать сейчас (у вас уже есть API key)

**Не присылайте API key в чат.** Он остаётся только у вас.

Пока домен в Resend не добавлен, тестовые письма с `onboarding@resend.dev` приходят **только на email вашего аккаунта Resend** (sheroz.yunusov2001@…). Для писем любым абитуриентам позже нажмите **Add domain** в Resend.

---

## Вариант A — быстро на Cloudflare (рекомендую)

На своём компьютере (нужны Node.js и аккаунт Cloudflare):

```bash
cd docs/bridge-career-guide
npm i -g wrangler   # или: npx wrangler ...
npx wrangler login
```

Запишите секрет (вставьте ключ `re_...` когда спросит — он не попадёт в git):

```bash
npx wrangler secret put RESEND_API_KEY
```

Опционально, после **Add domain** в Resend:

```bash
npx wrangler secret put OTP_FROM_EMAIL
# пример значения: BRIDGE <noreply@ваш-домен.com>
```

Деплой:

```bash
npx wrangler deploy
```

Проверка:

```bash
curl https://bridge-career-guide.<ваш-subdomain>.workers.dev/api/health
# emailConfigured: true
```

Откройте сайт → регистрация **на тот же email, что в Resend** → код должен прийти письмом (на экране не показывается).

---

## Вариант B — локальный тест Worker

```bash
cd docs/bridge-career-guide
cp .dev.vars.example .dev.vars
# откройте .dev.vars и вставьте RESEND_API_KEY=re_...
npx wrangler dev
```

Откройте URL из терминала (обычно http://127.0.0.1:8787).

---

## Потом (для всех пользователей)

1. В Resend: **Add domain** → пропишите DNS записи  
2. `wrangler secret put OTP_FROM_EMAIL` → `BRIDGE <noreply@ваш-домен.com>`  
3. `wrangler deploy` снова  

---

## Как это работает в коде

- Worker шлёт код через Resend API  
- Браузеру отдаётся подписанный `token` (не сам код)  
- При вводе кода Worker проверяет token + код  
- KV для OTP больше не обязателен  
