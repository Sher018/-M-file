/**
 * BRIDGE API Worker — email OTP via Resend.
 * OTP proof = signed token (no KV required). Optional OTP_KV for rate limits.
 * Sign-in and feedback require Turnstile unless ALLOW_DEMO_OTP=true.
 *
 * Secrets: RESEND_API_KEY, OTP_SIGNING_SECRET, TURNSTILE_SECRET
 * Optional: OTP_FROM_EMAIL, ALLOW_DEMO_OTP, OTP_KV
 */

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow =
    origin === "https://bridge-tj.lol" ||
    origin === "https://www.bridge-tj.lol" ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ? origin
      : "https://bridge-tj.lol";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com https://api.resend.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

const TURNSTILE_HOSTS = new Set(["bridge-tj.lol", "www.bridge-tj.lol"]);

function demoAllowed(env) {
  return String(env.ALLOW_DEMO_OTP || "") === "true";
}

async function verifyTurnstile(request, env, token, expectedAction) {
  if (demoAllowed(env)) return null;
  if (!env.TURNSTILE_SECRET) return json({ ok: false, error: "captcha_not_configured" }, 503, request);
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return json({ ok: false, error: "captcha" }, 403, request);
  }
  let result;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
    });
    if (!r.ok) throw new Error("siteverify");
    result = await r.json();
  } catch {
    return json({ ok: false, error: "captcha" }, 403, request);
  }
  if (result?.success !== true || result.action !== expectedAction || !TURNSTILE_HOSTS.has(result.hostname)) {
    return json({ ok: false, error: "captcha" }, 403, request);
  }
  return null;
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(request ? corsHeaders(request) : { "Access-Control-Allow-Origin": "https://bridge-tj.lol" }),
      ...SECURITY_HEADERS,
    },
  });
}

function withSecurity(res) {
  const headers = new Headers(res.headers);
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function genCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64url(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes);
  arr.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlJson(obj) {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig));
}

function signingSecret(env) {
  const secret = env.OTP_SIGNING_SECRET;
  if (!secret) return null;
  return secret;
}

async function makeToken(env, payload) {
  const secret = signingSecret(env);
  if (!secret) throw new Error("no_signing_secret");
  const body = b64urlJson(payload);
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

async function readToken(env, token) {
  const secret = signingSecret(env);
  if (!secret || !token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = await hmacSign(secret, body);
  if (expect.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expect.length; i++) ok |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return null;
  try {
    const jsonStr = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function sendResend({ apiKey, from, to, code, lang }) {
  const subjects = {
    ru: "BRIDGE — код входа",
    en: "BRIDGE — sign-in code",
    tg: "BRIDGE — рамзи вуруд",
  };
  const bodies = {
    ru: `Ваш код подтверждения BRIDGE: ${code}\nДействует 10 минут.\nЕсли это не вы — проигнорируйте письмо.`,
    en: `Your BRIDGE verification code: ${code}\nValid for 10 minutes.\nIf this wasn't you, ignore this email.`,
    tg: `Рамзи тасдиқи BRIDGE: ${code}\n10 дақиқа эътибор дорад.\nАгар шумо набошед — номаро нодида гиред.`,
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: subjects[lang] || subjects.ru,
      text: bodies[lang] || bodies.ru,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`resend_${res.status}:${err.slice(0, 200)}`);
  }
  return res.json();
}

async function handleOtpRequest(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.email) return json({ ok: false, error: "bad_email" }, 400, request);
  const email = String(body.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "bad_email" }, 400, request);

  if (body.mode === "register") {
    const c = body.consents || {};
    if (!c.pd || !c.age || !c.terms) return json({ ok: false, error: "consents_required" }, 400, request);
  }
  const lang = ["ru", "en", "tg"].includes(body.lang) ? body.lang : "ru";
  const captcha = await verifyTurnstile(
    request,
    env,
    body["cf-turnstile-response"],
    body.mode === "register" ? "signup" : "login"
  );
  if (captcha) return captcha;
  const allowDemo = demoAllowed(env);
  if (!signingSecret(env)) {
    if (!allowDemo) return json({ ok: false, error: "signing_not_configured" }, 503, request);
    return json({ ok: true, demo: true, code: genCode(), expiresIn: 600 }, 200, request);
  }
  const limited = await takeRate(env, request, email);
  if (limited) return limited;

  const code = genCode();
  const codeHash = await sha256(`${email}:${code}`);
  const ttl = 600;
  const exp = Date.now() + ttl * 1000;
  const token = await makeToken(env, {
    email,
    codeHash,
    name: body.name || "",
    country: body.country || "TJ",
    mode: body.mode || "login",
    consents: body.consents || null,
    attempts: 0,
    exp,
  });

  const apiKey = env.RESEND_API_KEY;
  const from = env.OTP_FROM_EMAIL || "BRIDGE <onboarding@resend.dev>";

  if (!apiKey) {
    if (!allowDemo) return json({ ok: false, error: "email_not_configured" }, 503, request);
    return json({ ok: true, demo: true, code, token, expiresIn: ttl }, 200, request);
  }

  try {
    await sendResend({ apiKey, from, to: email, code, lang });
    return json({ ok: true, demo: false, token, expiresIn: ttl }, 200, request);
  } catch (e) {
    if (allowDemo) {
      return json({ ok: true, demo: true, code, token, expiresIn: ttl, warn: String(e.message || e) }, 200, request);
    }
    return json({ ok: false, error: "send_failed" }, 502, request);
  }
}

async function handleOtpVerify(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.code) return json({ ok: false, error: "bad_request" }, 400, request);
  const email = String(body.email).trim().toLowerCase();
  const code = String(body.code).trim();
  if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "bad_code" }, 400, request);

  const pending = await readToken(env, body.token);
  if (!pending) return json({ ok: false, error: "expired" }, 400, request);
  if (pending.email !== email) return json({ ok: false, error: "bad_code" }, 400, request);
  if (Date.now() > Number(pending.exp || 0)) return json({ ok: false, error: "expired" }, 400, request);
  if (Number(pending.attempts || 0) >= 5) return json({ ok: false, error: "locked" }, 410, request);

  const codeHash = await sha256(`${email}:${code}`);
  if (codeHash !== pending.codeHash) {
    const attempts = Number(pending.attempts || 0) + 1;
    const token = await makeToken(env, { ...pending, attempts });
    if (attempts >= 5) return json({ ok: false, error: "locked", token }, 410, request);
    return json({ ok: false, error: "bad_code", token }, 400, request);
  }

  return json({
    ok: true,
    email,
    name: pending.name,
    country: pending.country,
    mode: pending.mode,
    consents: pending.consents,
  }, 200, request);
}

async function handleFx(request) {
  const fallback = { ok: true, base: "CNY", usd: 0.14, updated_at: "2026-10-09", stale: true };
  try {
    const cache = caches.default;
    const cacheReq = new Request("https://bridge-tj.lol/cache/fx");
    const hit = await cache.match(cacheReq);
    if (hit) return withSecurity(hit);
    const res = await fetch("https://open.er-api.com/v6/latest/CNY");
    const data = await res.json();
    const usd = Number(data?.rates?.USD);
    if (!usd) return json(fallback, 200, request);
    const body = new Response(JSON.stringify({ ok: true, base: "CNY", usd, updated_at: data.time_last_update_utc || new Date().toISOString(), stale: false }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=86400", ...corsHeaders(request), ...SECURITY_HEADERS },
    });
    await cache.put(cacheReq, body.clone());
    return body;
  } catch {
    return json(fallback, 200, request);
  }
}

async function takeRate(env, request, email) {
  const allowDemo = demoAllowed(env);
  if (!env.OTP_KV) {
    if (allowDemo) return null;
    return json({ ok: false, error: "rate_limit_unavailable" }, 503, request);
  }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const emailKey = `rate:email:${await sha256(email)}`;
  const ipKey = `rate:ip:${await sha256(ip)}`;
  const emailHits = Number((await env.OTP_KV.get(emailKey)) || "0");
  const ipHits = Number((await env.OTP_KV.get(ipKey)) || "0");
  if (emailHits >= 5 || ipHits >= 20) return json({ ok: false, error: "rate_limited" }, 429, request);
  await env.OTP_KV.put(emailKey, String(emailHits + 1), { expirationTtl: 3600 });
  await env.OTP_KV.put(ipKey, String(ipHits + 1), { expirationTtl: 3600 });
  return null;
}

async function handleFeedback(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.message || String(body.message).trim().length < 2 || String(body.message).length > 1000) {
    return json({ ok: false, error: "bad_request" }, 400, request);
  }
  const captcha = await verifyTurnstile(request, env, body["cf-turnstile-response"], "feedback");
  if (captcha) return captcha;
  const allowDemo = demoAllowed(env);
  if (!env.OTP_KV && !allowDemo) return json({ ok: false, error: "rate_limit_unavailable" }, 503, request);
  if (env.OTP_KV) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const key = `rate:fb:${await sha256(ip)}`;
    const hits = Number((await env.OTP_KV.get(key)) || "0");
    if (hits >= 5) return json({ ok: false, error: "rate_limited" }, 429, request);
    await env.OTP_KV.put(key, String(hits + 1), { expirationTtl: 3600 });
  }
  const kind = body.kind === "bug" ? "bug" : "data_error";
  const to = env.FEEDBACK_TO_EMAIL;
  if (!env.RESEND_API_KEY || !to) return json({ ok: false, error: "not_configured" }, 503, request);
  const from = env.OTP_FROM_EMAIL || "BRIDGE <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[BRIDGE] ${kind} ${body.ref || ""}`.trim(),
      text: String(body.message).slice(0, 1000) + (body.email ? `\nfrom: ${body.email}` : ""),
    }),
  });
  if (!res.ok) return json({ ok: false, error: "send_failed" }, 502, request);
  return json({ ok: true }, 200, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { ...corsHeaders(request), ...SECURITY_HEADERS } });

    if (url.pathname === "/api/otp/request" && request.method === "POST") {
      return handleOtpRequest(request, env);
    }
    if (url.pathname === "/api/otp/verify" && request.method === "POST") {
      return handleOtpVerify(request, env);
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true }, 200, request);
    }
    if (url.pathname === "/api/fx" && request.method === "GET") {
      return handleFx(request);
    }
    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return handleFeedback(request, env);
    }
    if (url.pathname === "/api/send-otp" && request.method === "POST") {
      return handleOtpRequest(request, env);
    }

    if (env.ASSETS) {
      const res = await env.ASSETS.fetch(request);
      return withSecurity(res);
    }
    return json({ ok: false, error: "not_found" }, 404, request);
  },
};
