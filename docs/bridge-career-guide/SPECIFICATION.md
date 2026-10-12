# SPECIFICATION — BRIDGE · To China

> Слой 2 Spec-First. Источник: `PROJECT_IDEA.md` v1.0.
> Назначение: AI-агент реализует модули без уточняющих вопросов.
> Статус: **v1.0 — на ревью владельца продукта.**
> Scope документа: **MVP** полностью + **v1** (облачный аккаунт) полностью; v2/v3 — только интерфейсы данных, чтобы MVP их не ломал.

---

## 0. Соглашения

| Тема | Правило |
|------|---------|
| Языки UI | `ru` (по умолчанию), `tg`, `en`. Любой пользовательский текст — объект `{ ru, tg, en }`. Отсутствующий перевод → fallback `ru`. |
| Валюты | Хранение **только CNY (integer)**. Отображение `¥12 000 · ≈ $1 650`. Курс из `/api/fx`, кэш 24 ч, fallback `data/fx-fallback.json`. |
| Идентификаторы | `text` slug: `[a-z0-9-]{2,64}`. Университет: `zju`, программа: `zju-gcm-ba`, грант: `csc-bilateral`, город: `hangzhou`. Пользовательские сущности в D1: `uuid v4`. |
| Даты | ISO `YYYY-MM-DD` в данных; `timestamptz` (ISO с `Z`) в D1. Год приёма — `intake_year integer`. |
| Правило источника | Любая запись каталога/гида имеет `source_url` (https, официальный домен) и `checked_at`. Валидатор `scripts/validate-data.mjs` **падает**, если поля нет. Запись без источника в прод не попадает. |
| Деньги | `integer` CNY, без копеек. Диапазоны — `{ min, max }`. |
| Пустые данные | `null` + UI показывает «нет данных» (`t('no_data')`). Никогда не заполняется предположением. |
| Безопасность вывода | Все динамические строки → `escapeHtml()`; markdown гидов → whitelist-рендер (`p, h2, h3, ul, ol, li, a[href^=https], strong, em, table`). |
| Файлы данных | `data/*.json`, UTF-8, отсортированы по `id`; каждая коллекция — `{ "version": "2026-10-12", "items": [...] }`. |

---

## 1. Дизайн-система

### 1.1 Токены (`styles.css :root`)

```css
--brand-900:#013220; --brand-600:#0B6E4F; --brand-400:#50C878; --brand-100:#D1F2EB;
--n-0:#FFFFFF; --n-50:#F5F5F7; --n-100:#E8E8ED; --n-500:#6E6E73; --n-900:#1D1D1F;
--ok:#50C878; --warn:#B8860B; --err:#C0392B;
--r-sm:12px; --r-md:18px; --r-lg:24px; --r-pill:999px;
--shadow-1:0 2px 12px rgba(1,50,32,.06); --shadow-2:0 12px 40px rgba(1,50,32,.12);
--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif;
--ease: cubic-bezier(.22,.61,.36,1); --dur: 320ms;
```

Тёмная тема (`[data-theme=dark]`, v1): `--bg:#0A1F17; --surface:#0F2B20; --text:#F5F5F7; --accent:#50C878`.

### 1.2 Типографика

| Роль | Desktop | Mobile | Вес | Межстрочный |
|------|---------|--------|-----|-------------|
| Display (hero) | 72px | 40px | 600 | 1.05, letter-spacing −0.02em |
| H1 | 48px | 32px | 600 | 1.1 |
| H2 | 32px | 26px | 600 | 1.15 |
| H3 | 22px | 20px | 600 | 1.25 |
| Body | 17px | 17px | 400 | 1.47 |
| Caption | 14px | 13px | 400 | 1.4, цвет `--n-500` |

### 1.3 Компоненты (атомы, один CSS-класс = один компонент)

| Класс | Описание |
|-------|----------|
| `.btn` / `.btn--primary` (`--brand-600`, текст белый) / `.btn--secondary` (обводка `--brand-600`) / `.btn--ghost` | Высота 48px, `--r-pill`, padding 0 24px, hover: яркость −6 %, focus-ring 3px `--brand-400` 40 % |
| `.card` | фон `--n-0`, `--r-lg`, `--shadow-1`, hover: `--shadow-2` + translateY(−2px) |
| `.chip` / `.chip--active` | фильтры; `--r-pill`, 36px, active = `--brand-100` фон + `--brand-900` текст |
| `.tag` | метки «CSC», «без HSK», «EN»; 24px, `--brand-100` |
| `.badge--ok` / `--warn` / `--err` | статусы дедлайнов |
| `.nav` | 48px, `position:sticky; backdrop-filter:blur(20px); background:rgba(255,255,255,.72)` |
| `.sheet` | модалка снизу на mobile, центр на desktop; закрытие Esc/клик вне/свайп вниз |
| `.progress` | полоса 6px, заливка `--brand-400` |
| `.empty` | пустое состояние: иконка моста (mark.svg, `--n-100`), текст, CTA |
| `.skeleton` | загрузка: серый шиммер `--n-100` |

### 1.4 Сетка и брейкпоинты

`≤640` mobile (1 колонка, нижняя таб-навигация) · `641–1024` tablet (2 колонки) · `≥1025` desktop (контейнер 1120px, 3 колонки карточек).

### 1.5 Движение

Появление секций: `opacity 0→1, translateY 16→0`, `--dur`, `IntersectionObserver` threshold .15. Уважать `prefers-reduced-motion: reduce` → без анимаций.

### 1.6 Логотип

`assets/brand/logo-dark.svg` (мост+текст `#013220`), `logo-light.svg` (белый), `mark.svg` (мост, favicon/PWA 512×512). Текст «BRIDGE» — `font-weight:600; letter-spacing:.08em`, «To China» — `font-weight:400; letter-spacing:.3em`. Высота в навигации 28px.

---

## 2. Модуль Landing (гость)

### 2.1 User stories
- Гость видит за 5 секунд, что это и для кого.
- Гость видит 3 ключевые функции с реальными скриншотами, число вузов/грантов (из данных), дисклеймер «мы гид, подаёшь ты сам».
- Гость нажимает «Начать» → экран регистрации. Кнопки каталога для гостя ведут на регистрацию.

### 2.2 Экран `#/` (гость)

| Секция | Содержимое |
|--------|-----------|
| Hero | Display: `t('hero_title')` («Поступи в вуз Китая без агента»); подзаголовок; `.btn--primary` «Начать» → `#/auth`; `.btn--ghost` «Как это работает» → якорь |
| Цифры | `{{unis_count}} вузов · {{programs_count}} программ · {{scholarships_count}} грантов · {{docs_count}} документов` — считаются из `data/*.json` при загрузке |
| 3 шага | Карточки: «Выбери вуз и грант» · «Собери документы» · «Следи за сроками» |
| Для кого | ТЖ / РФ, бакалавр · магистр · языковые курсы |
| Доверие | «Каждая цифра — со ссылкой на официальный источник и датой проверки» |
| Дисклеймер | `t('disclaimer_not_agent')` |
| Футер | Логотип light на `--brand-900`, ссылки: условия, конфиденциальность, «Поддержать проект», язык |

### 2.3 Логика
`isAuthed() === false` → показывать landing; любая ссылка на `#/unis|#/uni/*|#/path|#/test|#/guides/*` → редирект `#/auth?next=<hash>`. Авторизованный на `#/` → редирект `#/unis`.

### 2.4 Edge cases
- JS отключён → `<noscript>` с текстом landing и email для связи.
- Данные не загрузились → цифры скрыты, не «0».

---

## 3. Модуль Auth (email OTP)

Текущая реализация (Worker + Resend + HMAC-токен) сохраняется с изменениями ниже.

### 3.1 User stories
- Регистрация: email, имя, страна (TJ/RU/other), согласия (3 чекбокса) → код на почту → вход.
- Вход: email → код → вход. Если email не регистрировался — предлагать регистрацию.
- Выход. Удаление данных «на этом устройстве» (MVP) / аккаунта (v1).

### 3.2 Данные (MVP, localStorage)

```
bridge-session-v3  { email text, name text, country text, lang text, createdAt timestamptz }
bridge-otp-pending { email, token, expiresAt, mode: 'register'|'login' }
```

### 3.3 API

| Метод, путь | Тело | Ответ 200 | Ошибки |
|-------------|------|-----------|--------|
| `POST /api/otp/request` | `{ email, lang, mode, name?, country?, consents?: { privacy:true, age:true, terms:true, version:'2026-10' } }` | `{ ok:true, token, expiresIn:600 }` | `400 bad_email` · `400 consents_required` (mode=register без всех трёх) · `429 rate_limited` (>5 запросов/email/час или >20/IP/час) · `503 email_not_configured` · `502 send_failed` |
| `POST /api/otp/verify` | `{ email, code, token }` | `{ ok:true, email, name, country, mode, consents, session? }` | `400 bad_code` (счётчик попыток в токене: после 5 → `410 locked`, нужен новый код) · `400 expired` |
| `GET /api/health` | — | `{ ok, emailConfigured, kv, demo:false, mode }` | — |

Изменения относительно текущего кода:
1. Код — **6 цифр** (`100000–999999`). Текст письма и UI обновить.
2. `rate_limited` считается в KV `OTP_KV` по ключам `rate:email:<sha>` и `rate:ip:<ip>` (TTL 3600). Без KV — лимит только в токене (попытки).
3. Счётчик неверных попыток: `verify` при ошибке возвращает новый `token` с `attempts+1`; клиент его сохраняет. `attempts ≥ 5` → `410 locked`.
4. `ALLOW_DEMO_OTP` в проде = `"false"` всегда; при `true` UI показывает жёлтый баннер «демо-режим».
5. `CORS Allow-Origin` = `https://bridge-tj.lol`, `https://www.bridge-tj.lol`, `http://localhost:*` (вместо `*`).
6. v1: при успешном verify Worker выдаёт `Set-Cookie: bridge_sid=<uuid>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` и создаёт запись в D1 `sessions`.

### 3.4 Экран `#/auth`
Две вкладки «Регистрация» / «Вход». Поля: email (type=email, autocomplete=email), имя (register), страна (select TJ/RU/other), 3 чекбокса согласий со ссылками на `legal/*.html` (открываются в `.sheet`). Шаг 2: 6 полей-ячеек для кода (`inputmode=numeric`, автопереход, вставка целиком), таймер «отправить снова через 60 с», ссылка «изменить email».

### 3.5 Edge cases
- Код введён после `expiresIn` → `expired` → кнопка «Отправить новый».
- Пользователь закрыл вкладку между шагами → при открытии `#/auth` показываем шаг 2, если `bridge-otp-pending.expiresAt > now`.
- Письмо в спаме → подсказка после 30 с ожидания.
- `mode=login`, но email неизвестен (MVP: нет в localStorage этого устройства) → всё равно отправляем код; после verify создаём локальный профиль с `name=''` и просим имя.

---

## 4. Модель данных каталога (`data/*.json`)

Типы: `text`, `int`, `bool`, `date`, `money` (= int CNY), `i18n` (= `{ru,tg,en}`), `url` (https), `enum`, `T[]`.

### 4.1 `universities.json`

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `id` | text | ✓ | slug |
| `name` | i18n | ✓ | |
| `short` | text | ✓ | аббревиатура «ZJU» |
| `city_id` | text → cities | ✓ | |
| `tier` | enum `c9\|985\|211\|double_first\|provincial\|sino_foreign\|private` | ✓ | |
| `founded` | int | | |
| `rank_qs`, `rank_arwu` | int | | null = нет в рейтинге |
| `students_total`, `students_intl` | int | | |
| `quota_intl` | int | | мест для иностранцев на бакалавр EN; null = нет данных |
| `intakes` | enum[] `march\|september` | ✓ | |
| `application_fee` | money | | |
| `dorm` | `{ types: text[], price_min: money, price_max: money, included: text[] }` | | |
| `insurance` | money | | в год |
| `requirements` | `{ age_min:int, age_max:int, english:text, hsk:int\|null, csca:bool, diploma:text }` | ✓ | `english` как строка «IELTS 6.0 / TOEFL 80» |
| `photos` | `{ url, source_url, alt:i18n }[]` | | ≤3 |
| `links` | `{ official:url, admission:url, apply:url?, campus_map:url?, video:url? }` | ✓ `official`, `admission` | |
| `program_ids`, `scholarship_ids`, `document_ids`, `deadline_ids` | text[] | ✓ | ссылки |
| `cluster_ids` | text[] | ✓ | для теста |
| `csc_agency_no` | text | | номер агентства CSC |
| `blurb` | i18n | ✓ | ≤160 символов |
| `source_url`, `checked_at` | url, date | ✓ | |

### 4.2 `programs.json`

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id`, `uni_id` | text | ✓ |
| `name` | i18n | ✓ |
| `degree` | enum `language\|bachelor\|master\|phd` | ✓ |
| `language` | enum `en\|zh\|bilingual` | ✓ |
| `discipline` | enum (список из `data/disciplines.json`, ~25 значений: business, finance, cs, engineering, medicine, law, …) | ✓ |
| `cluster_ids` | text[] | ✓ |
| `duration_years` | number (0.5, 1, 4, 2, 3) | ✓ |
| `tuition_year` | money | ✓ (null разрешён → «нет данных») |
| `intake` | enum | ✓ |
| `deadline_id` | text | |
| `requirements` | `{ english:text, hsk:int\|null, exams:text[] }` | ✓ |
| `scholarship_ids` | text[] | |
| `apply_url` | url | |
| `source_url`, `checked_at` | | ✓ |

### 4.3 `scholarships.json`

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id` | text | ✓ |
| `name` | i18n | ✓ |
| `type` | enum `csc_bilateral\|csc_university\|csc_great_wall\|csc_silk_road\|provincial\|university\|confucius\|other` | ✓ |
| `provider` | i18n | ✓ |
| `scope` | enum `national\|province\|university` + `uni_id?` / `province_id?` | ✓ |
| `coverage` | `{ tuition_pct:int 0–100, dorm:bool, stipend_month:money\|null, insurance:bool }` | ✓ |
| `eligible_degrees` | enum[] | ✓ |
| `eligible_countries` | `'all'` или ISO[] | ✓ |
| `requirements` | `{ text:i18n, document_id?:text }[]` | ✓ |
| `how_to_apply` | `{ TJ:i18n, RU:i18n, all:i18n }` | ✓ ≥ `all` |
| `deadline_id` | text | |
| `apply_url` | url | ✓ |
| `csc_agency_no` | text | |
| `source_url`, `checked_at` | | ✓ |

### 4.4 `documents.json`

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id` | text | ✓ |
| `name`, `what` | i18n | ✓ |
| `how_to_get` | `{ TJ:i18n, RU:i18n, all:i18n }` | ✓ |
| `needs_translation`, `needs_notary`, `needs_apostille` | bool | ✓ |
| `validity_months` | int | |
| `lead_time_days` | int | ✓ (для таймлайна; например, несудимость — 30) |
| `cost_estimate_usd` | `{ min, max }` | |
| `aliases` | text[] | ✓ (для миграции со старых строк) |
| `source_url`, `checked_at` | | ✓ |

### 4.5 `deadlines.json`

| Поле | Тип | Обяз. |
|------|-----|-------|
| `id` | text | ✓ |
| `label` | i18n | ✓ |
| `applies_to` | enum `csc\|provincial\|uni\|program\|visa\|arrival` | ✓ |
| `uni_id`, `program_id`, `scholarship_id` | text | |
| `date_from`, `date_to` | date | ✓ `date_to` |
| `intake_year` | int | ✓ |
| `recurring` | bool | ✓ (если true — UI переносит на следующий год автоматически) |
| `source_url`, `checked_at` | | ✓ |

### 4.6 `cities.json`

`id, name:i18n, province:i18n, lat:number, lng:number, population:int?, cost_of_living_month:{min,max}:money?, climate:i18n?, airport:text?, source_url, checked_at`.

### 4.7 `guides/*.json` (v1)

`id, slug, title:i18n, country: 'TJ'|'RU'|'all', sections:[{ heading:i18n, body_md:i18n, source_url, checked_at }], updated_at`.
Slugs MVP→v1: `visa-x1`, `visa-x2`, `hsk`, `legalization`, `csc-apply-tj`, `csc-apply-ru`, `arrival`.

### 4.8 `partners.json` (v1)

`id, name:i18n, category: enum translation|notary|medical|insurance|other, country, url, description:i18n, is_ad:true, added_at`.

### 4.9 Валидация (`scripts/validate-data.mjs`)
- Все ссылочные id существуют; нет дубликатов `id`.
- Все `source_url` — https и отвечают 2xx/3xx (HEAD, таймаут 10 с; флаг `--offline` пропускает).
- `checked_at` не старше 365 дней → warning; старше 540 → error.
- Каждая `i18n` имеет `ru`; `tg`/`en` отсутствуют → warning.
- Запускается в CI (GitHub Actions) на каждый PR, падает при error.

---

## 5. Модуль Catalog (поиск и карточки)

### 5.1 User stories
- Найти вузы по фильтрам за ≤3 клика, видеть количество результатов.
- Переключать «Вузы» / «Программы».
- Сортировать: цена ↑, рейтинг QS ↑, название, «подходит по тесту» (если тест пройден).
- Ссылка с фильтрами копируется (состояние в query hash).

### 5.2 Экран `#/unis?degree=bachelor&lang=en&city=hangzhou&price_max=30000&sch=1&tier=985,211&disc=business&intake=september&sort=price&view=unis&q=zhe`

| Зона | Содержимое |
|------|-----------|
| Шапка | H1 «Вузы Китая», счётчик `N вузов · M программ`, поле поиска (по `name.*`, `short`, `city.name.*`, debounce 200 мс) |
| Фильтры (desktop — левая колонка 280px; mobile — кнопка «Фильтры (3)» → `.sheet`) | Степень (chips, multi) · Язык (chips) · Город/провинция (combobox) · Дисциплина (chips) · Цена/год, USD (слайдер 0–15 000, шаг 500) · Только с грантом (toggle) · Тип вуза (chips) · Набор (chips) · Без HSK (toggle) · «Подходит по тесту» (toggle, виден после теста) · «Сбросить» |
| Результаты | Сетка `.card`; пагинация «показать ещё 24»; `.empty` при 0 |
| Карта (desktop, v1) | SVG Китая с точками-кластерами по городам; клик по точке = фильтр по городу |

### 5.3 Карточка вуза (`.card.uni`)
Фото/плейсхолдер 16:9 · `tag` tier · Название (lang) · Город · «от ¥X/год ≈ $Y» (минимум по `programs` выбранной степени) · теги: «CSC», «EN», «без HSK» · рейтинг QS · кнопка «В мой путь» (иконка +, toggle) · вся карточка — ссылка `#/uni/:id`.

### 5.4 Карточка программы (`.card.prog`)
Название · вуз · степень · язык · длительность · цена · набор · дедлайн (badge по сроку) · «Открыть вуз».

### 5.5 Логика фильтрации
```
visible(uni) = programs(uni).some(p => matchesProgramFilters(p)) && matchesUniFilters(uni)
price(uni)   = min(p.tuition_year | p ∈ matched programs), null → показываем «нет данных», сортируется в конец
sch=1        = uni.scholarship_ids.length>0 || matched programs have scholarship_ids
no_hsk       = p.requirements.hsk == null && p.language=='en'
fits_test    = uni.cluster_ids ∩ result.topClusters ≠ ∅ (вес: 2 совпадения выше 1)
```
Состояние фильтров ↔ hash query, двусторонне. Пустой query = без фильтров.

### 5.6 Edge cases
- Фильтр даёт 0 → `.empty` «Смягчите фильтры» + кнопка «Сбросить цену» (самый частый виновник).
- `tuition_year=null` у всех программ вуза → карточка показывает «цена: нет данных», не исключается из выдачи, кроме фильтра по цене.
- 300+ вузов × 10 программ = 3 000 объектов — фильтрация на клиенте ≤ 20 мс; данные грузятся одним `catalog.bundle.json` (gzip ≈ 400 KB), кэш `Cache-Control: max-age=3600, stale-while-revalidate=86400`.

---

## 6. Модуль University page

### 6.1 User stories
- Полная информация о вузе на одном экране, без ухода на внешние сайты, но с кнопками «Официальный сайт» / «Подать заявку».
- Кликабельные гранты и документы.
- Добавить вуз в «Мой путь в Китай», выбрать гранты.

### 6.2 Экран `#/uni/:id`

| Блок | Содержимое |
|------|-----------|
| Hero | Фото (или градиент `--brand-100→--n-0`) · название · город, провинция · tier tag · QS/ARWU · кнопки: «В мой путь» (toggle) · «Официальный сайт» · «Подать заявку» |
| Мини-карта | SVG Китая 320×260, точка `--brand-600` + пульс; подпись города; клик → `#/unis?city=` |
| Ключевые цифры | 4 плитки: обучение от/год · общежитие от/год · мест для иностранцев · application fee. Каждая со `source_url` (иконка ⓘ → tooltip «Источник · проверено 12.10.2026») |
| Программы | Таблица/карточки по степеням (вкладки: Языковые · Бакалавр · Магистр); колонки: название, язык, длительность, цена, набор, дедлайн, требования |
| Гранты | Список `scholarships` (вуз + национальные, доступные `eligible_countries` ∋ страна пользователя). Каждый — `.card` с покрытием (иконки: обучение %, общежитие, стипендия ¥/мес) и чекбоксом «Выбрать» (активен, если вуз в пути). Клик по названию → `.sheet` грант (см. 7) |
| Документы | Чипы `documents`; клик → `.sheet` документ (см. 8). Кнопка «Все документы в мой чек-лист» (= добавить вуз) |
| Требования | Возраст, английский, HSK, CSCA, аттестат |
| Общежитие и жизнь | Типы, цены, что включено; стоимость жизни в городе (из `cities`) |
| Дедлайны | Таймлайн `deadlines` вуза + CSC для текущего `intake_year` |
| Источники | Список всех `source_url` блоков с `checked_at`; кнопка «Сообщить об ошибке» → `mailto:` с темой `[BRIDGE] uni:<id>` (MVP) |

### 6.3 Логика
- `intake_year` = если сегодня ≤ 30 июня → текущий год, иначе следующий. Дедлайны с `recurring:true` сдвигаются на этот год.
- Статус дедлайна: `>30 дней` → `badge--ok`, `7–30` → `--warn`, `<7` → `--err`, прошёл → серый «прошёл».
- Карта: `x = (lng − 73) / (135 − 73) * W`, `y = (53.5 − lat) / (53.5 − 18) * H` (равнопромежуточная проекция; контур `assets/china-map.svg` подготовлен в этих же границах).

### 6.4 Edge cases
- `id` не найден → экран 404 с поиском.
- Нет фото → градиент + `mark.svg`.
- Гранты с `eligible_countries` не включающими страну пользователя → раздел «Недоступно для вашей страны» (свёрнут).
- Чекбокс гранта у вуза, не добавленного в путь → клик добавляет вуз и выбирает грант одним действием (toast «Вуз добавлен в мой путь»).

---

## 7. Модуль Scholarships

### 7.1 Экран-sheet гранта
Название · провайдер · тип (tag) · покрытие (4 иконки) · «Для кого»: степени, страны · **Требования** (список; элементы с `document_id` — ссылка на документ) · **Как подать** — вкладки TJ / RU (из `how_to_apply`, fallback `all`) · дедлайн · `csc_agency_no` (копируемый) · кнопка «Подать на сайте гранта» (`apply_url`) · «Выбрать в мой путь» · источник + дата.

### 7.2 Экран `#/scholarships` (v1)
Каталог грантов с фильтрами: тип, степень, покрытие ≥ %, со стипендией, для моей страны. Карточка → sheet.

### 7.3 Правила данных CSC (обязательные записи MVP)
`csc-bilateral` (Type A, через посольство), `csc-university` (Type B, через вуз), `csc-great-wall`, `csc-silk-road`, `confucius-cis`. Все — с `how_to_apply.TJ` и `.RU`, `source_url` на `campuschina.org` / `csc.edu.cn` / сайт посольства.

### 7.4 Edge cases
- `stipend_month=null` → «стипендия: нет данных», не «0».
- Грант привязан к вузу, вуз удалён из пути → грант снимается автоматически (см. 9.4).

---

## 8. Модуль Documents

### 8.1 Экран-sheet документа
Название · «Что это» · «Как получить» вкладки TJ / RU · флаги: перевод / нотариус / апостиль (иконки) · срок действия · срок получения `lead_time_days` · ориентировочная стоимость USD · источник.

### 8.2 Миграция
Текущие строки `documents: ["Passport", "Diploma/transcript", …]` → `document_ids` через `aliases`. Скрипт `scripts/migrate-docs.mjs` выводит нераспознанные строки; они **добавляются в `documents.json` вручную**, не угадываются.

---

## 9. Модуль «Мой путь в Китай» (MVP — localStorage)

### 9.1 User stories
- Вижу все выбранные вузы, гранты, объединённый список документов, таймлайн, прогресс %.
- Отмечаю документы «собрал», шаги «сделал».
- Понимаю, что делать на этой неделе.
- Открываю с телефона и ПК — в MVP данные отдельные на устройстве, UI честно показывает «сохранено на этом устройстве»; v1 — синхронизация.

### 9.2 Данные (`localStorage['bridge-path-v1']`)

```ts
{
  version: 1,
  country: 'TJ'|'RU'|'other',
  degree: 'language'|'bachelor'|'master',
  intake_year: int,
  unis: { uni_id: text, added_at: timestamptz, program_id?: text, scholarship_ids: text[] }[],
  tasks: { key: text, done_at: timestamptz|null }[],   // key = 'doc:<document_id>' | 'step:<step_id>' | 'uni:<uni_id>:apply'
  updated_at: timestamptz
}
```
Лимит MVP: 10 вузов (при попытке 11-го — toast «Максимум 10 вузов в пути»).

### 9.3 Экран `#/path`

| Блок | Содержимое |
|------|-----------|
| Шапка | «Мой путь в Китай» · прогресс-кольцо % · `intake_year` (переключатель) · степень |
| Пусто | `.empty`: «Добавь первый вуз» → `#/unis` |
| Эта неделя | До 5 задач с ближайшим `due` (см. 9.5) |
| Вузы | Карточки: название, выбранные гранты (чипы), ближайший дедлайн, кнопка «Подал заявку» (task `uni:<id>:apply`), «Убрать» (confirm) |
| Документы | Объединённый список `∪ document_ids` всех вузов и выбранных грантов, дедуп по `id`; для каждого: чекбокс, «нужен для: ZJU, UIBE, CSC», флаги перевод/нотариус/апостиль, рекомендуемый срок начала = `earliest_deadline − lead_time_days − 14` |
| Таймлайн | Вертикальный: все дедлайны выбранных вузов/грантов + системные шаги (`step:*`): «Собрать документы», «Подать CSC Type A в посольство», «Подать в вузы», «Получить Admission Letter + JW202», «Виза X1», «Вылет». Даты системных шагов: из `deadlines` с `applies_to` или `null` → «дата зависит от вуза» |
| Действия | «Экспорт PDF» (v2, скрыто), «Очистить путь» (confirm) |

### 9.4 Логика
```
documents(path)   = dedup( ∪ uni.document_ids ∪ scholarship.requirements[].document_id (для выбранных) )
progress %        = done(tasks ∩ relevant) / relevant.length, где relevant = docs ∪ steps ∪ uni_apply
removeUni(id)     → удалить unis[id], tasks 'uni:<id>:*'; документы, оставшиеся без владельца, удалить из relevant (done-отметки сохранить до очистки)
toggleScholarship → только если грант доступен вузу (scope=university→uni_id совпадает | national | province совпадает)
```

### 9.5 «Эта неделя»
Задачи сортируются по `due`: `due(doc) = earliest_deadline_of_users(doc) − lead_time_days − 14 дней`; `due(uni_apply) = min(deadline of selected program/uni)`; показываем первые 5 незавершённых с `due ≤ today+14` или просроченные (badge `--err`).

### 9.6 Edge cases
- Пользователь менял `degree` → программы другой степени в `unis[].program_id` сбрасываются с toast.
- `intake_year` переключён на следующий → все `recurring` дедлайны пересчитаны; `recurring:false` и прошедшие → «дата прошлого набора, уточняйте».
- `localStorage` переполнен (> 5 MB) — невозможно при лимите 10 вузов; `QuotaExceededError` → toast «Не удалось сохранить».
- Вуз удалён из каталога при обновлении данных → карточка «Вуз больше не в каталоге» + кнопка «Убрать».

### 9.7 v1 — синхронизация
`PUT /api/path` c телом = объект 9.2; сервер хранит последнюю версию (last-write-wins по `updated_at`); при входе клиент делает `GET /api/path` и, если локальный `updated_at` новее — предлагает «Оставить данные с этого устройства / Загрузить из аккаунта».

---

## 10. Модуль Career Test

Существующий движок (`career-orientation-test.design.json`, `test-engine.js`) сохраняется.

### 10.1 Изменения
- Маршрут `#/test` — отдельный экран, не секция главной.
- Результат: сохраняется в `localStorage['bridge-test-result-v1']` `{ scores, topClusters[3], created_at }` (v1 → `POST /api/test/result`).
- На результате: 3 кластера → профессии → кнопка «Показать вузы под мой профиль» → `#/unis?fits_test=1&degree=<path.degree>`.
- В каталоге появляется фильтр «Подходит по тесту».

### 10.2 Edge cases
- Прервали тест → ответы в `sessionStorage`, предложение «Продолжить (вопрос 23/60)».
- Все кластеры с нулевым весом (все ответы нейтральные) → сообщение «Результат неинформативен, попробуйте отвечать более определённо», без рекомендаций.

---

## 11. Модуль Guides (v1)

Экран `#/guides` — список; `#/guides/:slug` — статья: оглавление слева (desktop), секции, под каждой — «Источник · проверено». Вкладка страны (TJ/RU) переключает `country`-специфичные секции. Markdown → whitelist HTML.

Контент: **создаётся пайплайном 13.3, никогда не пишется вручную без ссылки**.

---

## 12. Модуль Support (донаты) и Partners

### 12.1 `#/support` (MVP)
Текст «BRIDGE бесплатен; поддержка идёт на хостинг и обновление данных» · ЮMoney: ссылка `https://yoomoney.ru/to/<WALLET>` + QR (генерируется локально библиотекой `qrcode-svg`, 3 KB) · USDT (TRC-20): адрес, кнопка «Копировать», QR. Значения — из `data/support.json` (`{ yoomoney_url, usdt_trc20 }`). Никакого бэкенда и приёма платежей на сайте.

### 12.2 `#/partners` (v1)
Карточки из `partners.json`, сгруппированы по категории, заголовок «Партнёрские сервисы · реклама». Каждая: название, страна, описание, кнопка «Перейти» (`rel="sponsored noopener"`). Пустой файл → раздел скрыт из навигации.

---

## 13. Data pipeline

### 13.1 `scripts/parse-tuition.mjs` (есть)
Расширить: работает по `programs.json`, пишет `fees-live.json` → merge в `tuition_year` при `0.45 ≤ ratio ≤ 2.2`; иначе `warnings[]`. Запуск: GitHub Actions `cron: 0 3 * * 1` → PR «chore(data): tuition refresh».

### 13.2 `scripts/parse-deadlines.mjs` (v1)
Источники: `source_url` каждого `deadline`; regex по датам (`\b(\d{1,2})\s+(January|…|December)\s+(20\d\d)\b` и `20\d\d-\d\d-\d\d`) рядом с ключевыми словами `deadline|application period|截止`. Результат — diff в PR, не прямой коммит.

### 13.3 Production AI-агент «data-extractor» (v2)
- Вход: PDF/HTML admission guide (`source_url`), текущая запись.
- Инструкция: извлечь поля схем 4.1–4.5 **только если они явно присутствуют в документе**; для каждого поля вернуть `quote` (точная цитата) и `page`. Поля без цитаты → `null`.
- Выход: JSON-патч + `evidence[]`. Скрипт формирует PR; ревьюер видит цитату рядом с полем.
- Запрет: агент не имеет доступа к записи в `main`; температура 0; модель — любая с ≥128k контекстом.
- Для гидов: агент собирает секции из официальных страниц (посольство, csc.edu.cn, chinesetest.cn), каждая секция — `source_url` + `quote`. Ревью владельца обязательно.

### 13.4 Валидация — раздел 4.9.

---

## 14. Worker API (полный список)

| Метод, путь | Фаза | Auth | Описание |
|-------------|------|------|----------|
| `POST /api/otp/request` | MVP | — | §3 |
| `POST /api/otp/verify` | MVP | — | §3 |
| `GET /api/health` | MVP | — | §3 |
| `GET /api/fx` | MVP | — | `{ base:'CNY', usd: 0.1374, updated_at }`; источник `https://open.er-api.com/v6/latest/CNY`, кэш KV 24 ч; fallback константа при ошибке + `stale:true` |
| `POST /api/feedback` | MVP | — | `{ kind:'data_error'|'bug', ref:'uni:zju', message ≤1000, email? }` → письмо владельцу через Resend; 429 при >5/IP/час |
| `GET /api/me` | v1 | cookie | `{ email, name, country, lang, created_at }`; 401 |
| `PATCH /api/me` | v1 | cookie | `{ name?, lang?, country? }` |
| `DELETE /api/me` | v1 | cookie | soft-delete (`deleted_at`), удаление `paths`, `test_results`, cookie; 204 |
| `GET /api/path` | v1 | cookie | объект §9.2 или 404 |
| `PUT /api/path` | v1 | cookie | тело §9.2, валидируется (≤10 вузов, id существуют в каталоге); 409 если `updated_at` на сервере новее и нет `force:true` |
| `POST /api/test/result` | v1 | cookie | `{ scores, topClusters, created_at }` |
| `POST /api/auth/logout` | v1 | cookie | удаляет сессию, `Set-Cookie` с `Max-Age=0` |
| `GET /api/catalog/bundle` | v1 | — | склейка `data/*.json` с ETag; MVP — статический файл `catalog.bundle.json`, собираемый `scripts/build-bundle.mjs` |

Общие ответы: `{ ok:false, error:<code>, detail? }`. Коды: `400 bad_request`, `401 unauthorized`, `404 not_found`, `409 conflict`, `410 locked`, `429 rate_limited`, `500 internal`, `502 upstream`, `503 not_configured`.

---

## 15. D1 схема (v1) и политики доступа

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,                 -- uuid
  email       TEXT NOT NULL UNIQUE,             -- lower-case
  name        TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT 'TJ',       -- TJ|RU|other
  lang        TEXT NOT NULL DEFAULT 'ru',
  created_at  TEXT NOT NULL,                    -- timestamptz ISO
  deleted_at  TEXT
);
CREATE TABLE consents (
  user_id     TEXT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL,                    -- privacy|age|terms
  version     TEXT NOT NULL,                    -- '2026-10'
  accepted_at TEXT NOT NULL,
  ip_hash     TEXT,
  PRIMARY KEY (user_id, kind, version)
);
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,                 -- uuid в cookie
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  ua_hash     TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE paths (
  user_id     TEXT PRIMARY KEY REFERENCES users(id),
  body        TEXT NOT NULL,                    -- JSON §9.2 (jsonb-эквивалент)
  updated_at  TEXT NOT NULL
);
CREATE TABLE test_results (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  scores      TEXT NOT NULL,                    -- JSON
  clusters    TEXT NOT NULL,                    -- JSON text[]
  created_at  TEXT NOT NULL
);
CREATE INDEX test_results_user ON test_results(user_id, created_at DESC);
CREATE TABLE feedback (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  kind        TEXT NOT NULL,
  ref         TEXT,
  message     TEXT NOT NULL,
  email       TEXT,
  created_at  TEXT NOT NULL
);
```

**Политики доступа** (D1 не имеет RLS — политики реализуются в Worker-middleware `requireUser()` и обязательны для каждого запроса):

| Таблица | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| users | только `id = session.user_id` | только через `otp/verify` | только свои `name, lang, country` | только soft-delete свой |
| consents | свои | только через `otp/verify` при `mode=register` | — | — |
| sessions | — (внутреннее) | `otp/verify` | — | `logout`, истечение |
| paths | свои | свои | свои | при `DELETE /api/me` |
| test_results | свои | свои | — | при `DELETE /api/me` |
| feedback | — | любой (rate-limited) | — | — |

Каждый SQL-запрос с `user_id` обязан использовать параметр `?` из сессии — никогда из тела запроса. Тест `tests/policies.test.mjs` проверяет, что чужой `user_id` в теле игнорируется.

---

## 16. Безопасность, производительность, PWA

- CSP (есть) + убрать `'unsafe-inline'` для `script-src` → все обработчики в `app.js`, стили inline допустимы.
- Cookie `HttpOnly; Secure; SameSite=Lax` (v1); CSRF: проверять `Origin` на всех мутациях.
- Rate-limit в KV: `otp/request` 5/email/ч, 20/IP/ч; `feedback` 5/IP/ч; `PUT /api/path` 60/user/ч.
- Логи Worker без email в открытом виде (`sha256(email).slice(0,12)`).
- Производительность: LCP ≤ 2.5 с на 3G-fast; bundle JS ≤ 120 KB gzip; `catalog.bundle.json` ≤ 500 KB gzip, грузится после первого рендера landing/auth.
- PWA: `manifest.webmanifest` (name «BRIDGE · To China», theme `#013220`, icons из `mark.svg` 192/512), Service Worker: cache-first для `assets/*`, `styles.css`, `app.js`; stale-while-revalidate для `catalog.bundle.json`; network-only для `/api/*`.
- Доступность: контраст AA, фокус видим, `aria-label` на иконках, sheet — `role=dialog aria-modal`, фильтры — `fieldset/legend`.

---

## 17. i18n

- `i18n.js` остаётся источником UI-строк; **новые ключи** (минимум): `nav_path`, `path_title`, `path_empty`, `path_this_week`, `path_progress`, `path_limit`, `sch_select`, `sch_coverage_*`, `doc_needs_translation|notary|apostille`, `deadline_passed`, `no_data`, `source_checked_at`, `disclaimer_not_agent`, `support_title`, `partners_ad_label`, `filter_*` (12 шт.), `degree_language|bachelor|master`, `tier_*` (7).
- Числа и даты через `Intl.NumberFormat`/`Intl.DateTimeFormat` с локалями `ru-RU`, `tg-TJ` (fallback `ru-RU`), `en-GB`.
- Язык хранится в `localStorage['bridge-lang']`, `html[lang]` обновляется.

---

## 18. Аналитика (без cookies, без PII)

Cloudflare Web Analytics (beacon) **или** собственный `POST /api/event` (v1) с `{ name, props }` без идентификаторов пользователя. События MVP: `landing_view`, `auth_register_ok`, `catalog_filter_apply`, `uni_view`, `path_add_uni`, `path_select_scholarship`, `doc_sheet_open`, `support_view`.

---

## 19. План миграции с текущего кода

| Шаг | Что меняется | Риск |
|-----|-------------|------|
| 1 | `data-universities.js` → `data/universities.json` + `programs.json` (из `majors`/`englishPrograms`/`tuitionYear` по одной программе на вуз с `degree=bachelor`, остальное `null` + `checked_at`) | Потеря нюансов → сохранить исходный файл до ревью |
| 2 | `documents-catalog.js` → `documents.json`; `aliases` сохраняются | Нераспознанные строки → ручное добавление |
| 3 | `quota` объект → записи `scholarships.json` (`university`-scope) + национальные CSC-записи | Требования CSC — из официального источника, не из `quota.type` |
| 4 | `CHECKLIST` (app.js) → системные шаги `step:*` в §9.3 | — |
| 5 | Роутер: `#/` landing/redirect, `#/auth`, `#/unis`, `#/uni/:id`, `#/test`, `#/path`, `#/support`, `#/guides/*` (v1) | Старые ссылки `#/checklist`, `#/plan` → redirect `#/path` |
| 6 | `styles.css` переписать по §1; разметка `index.html` → шаблоны в `app.js` (один `<main id="app">`) | Регресс визуала → скриншот-тест до/после |
| 7 | Worker: 6-значный OTP, CORS, `/api/fx`, `/api/feedback` | Старые токены 4-значные → `expired`, пользователь запрашивает новый |
| 8 | `catalog.bundle.json` сборка + validate в CI | — |

---

## 20. Критерии приёмки MVP (QA-чеклист)

- [ ] Гость не видит каталог; любой deep-link ведёт на `#/auth?next=`; после входа — на `next`.
- [ ] Регистрация с 6-значным кодом на реальную почту ≤ 60 с; 5 неверных кодов → `locked`.
- [ ] Каталог: все 9 фильтров работают, состояние в URL, 0-результатов показывает `.empty`.
- [ ] Страница вуза: карта с точкой в правильном городе (проверка 5 городов), все блоки, каждая цифра с ⓘ-источником.
- [ ] Клик по гранту и документу открывает sheet с вкладками TJ/RU.
- [ ] Добавление 10 вузов, 11-й — toast; удаление вуза снимает его гранты и документы.
- [ ] «Мой путь в Китай»: объединённые документы без дубликатов; прогресс считается; «Эта неделя» ≤ 5 задач; таймлайн по `intake_year`.
- [ ] Переключение RU/TG/EN без перезагрузки; нет англицизмов в RU/TG там, где есть перевод.
- [ ] `scripts/validate-data.mjs` проходит; у 100 % записей `source_url` и `checked_at`.
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ] PWA устанавливается на Android/iOS; офлайн открывается последний загруженный каталог.
- [ ] `#/support` показывает ЮMoney и USDT с QR; никаких платёжных форм.
- [ ] Дисклеймер «мы гид, подаёшь ты сам» виден на landing и в «Моём пути».

---

## 21. Вне scope этого документа (v2/v3 — только интерфейсы зафиксированы)
Email-напоминания (`reminders` таблица: `user_id, deadline_id, send_at, sent_at`), сравнение вузов (`#/compare?ids=`), PDF-экспорт, лента изменений (`data/changelog.json`), агенты (`#/agents`, `data/agents.json` с полями `license_no, license_url, price_from, country`), кабинет куратора, AI-помощник.
