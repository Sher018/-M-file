# Инструкция: письма с кодом на почту (Resend + Cloudflare)

Сейчас код OTP может показываться на экране (**демо**), если Worker/ключ не настроены.  
Чтобы код **реально приходил на email**, сделайте шаги ниже (нужен аккаунт Cloudflare + Resend).

## Что сделает система

1. Пользователь вводит email → сайт вызывает `POST /api/otp/request`
2. Worker генерирует 4-значный код, сохраняет **хеш** в KV (10 мин)
3. Resend отправляет письмо на почту
4. Пользователь вводит код → `POST /api/otp/verify`
5. После проверки открывается сайт

В проде код **не возвращается** в браузер.

---

## Шаг 1. Аккаунт Resend (бесплатно для старта)

1. Зарегистрируйтесь: https://resend.com  
2. Создайте API Key: **API Keys → Create**  
3. Для тестов можно слать с `onboarding@resend.dev` **только на свой email**.  
4. Для писем любым пользователям — подтвердите свой домен в Resend (**Domains → Add**), затем в Worker укажите `OTP_FROM_EMAIL`, например:  
   `BRIDGE <noreply@ваш-домен.com>`

Сохраните ключ вида `re_xxxxx` — он понадобится как секрет.

---

## Шаг 2. Cloudflare KV для кодов

В папке сайта:

```bash
cd docs/bridge-career-guide
npx wrangler login
npx wrangler kv namespace create BRIDGE_OTP
npx wrangler kv namespace create BRIDGE_OTP --preview
```

Скопируйте `id` и `preview_id` в `wrangler.jsonc` → `kv_namespaces[0]`.

---

## Шаг 3. Секрет и отправитель

```bash
cd docs/bridge-career-guide
npx wrangler secret put RESEND_API_KEY
# вставьте re_xxxxx

# опционально, после верификации домена в Resend:
npx wrangler secret put OTP_FROM_EMAIL
# пример: BRIDGE <noreply@yourdomain.com>
```

В `wrangler.jsonc` оставьте `"ALLOW_DEMO_OTP": "false"` для продакшена.

Для локальной разработки создайте файл `.dev.vars` (не коммитьте):

```env
RESEND_API_KEY=re_xxxxx
ALLOW_DEMO_OTP=true
OTP_FROM_EMAIL=BRIDGE <onboarding@resend.dev>
```

---

## Шаг 4. Деплой

```bash
cd docs/bridge-career-guide
npx wrangler deploy
```

Проверка:

```bash
curl https://ВАШ-workers.dev/api/health
# {"ok":true,"emailConfigured":true,"kv":true,"demo":false}
```

Откройте сайт → регистрация → код должен прийти на почту (и **не** показываться на экране).

---

## Что нужно сделать вам лично

| Действие | Кто |
|----------|-----|
| Аккаунт Resend + API key | **Вы** |
| (Для всех адресов) домен в Resend | **Вы** |
| Cloudflare login + KV ids в `wrangler.jsonc` | **Вы** |
| `wrangler secret put RESEND_API_KEY` | **Вы** |
| `wrangler deploy` | **Вы** (или агент, если есть доступ) |

Без этих ключей сайт продолжит работать в **демо-режиме** (код на экране).

---

## Лимиты и безопасность

- 4-значный код + rate limit ~8 запросов/час с IP (KV)
- Код в KV как SHA-256, TTL 10 минут
- Не включайте `ALLOW_DEMO_OTP=true` на публичном домене
