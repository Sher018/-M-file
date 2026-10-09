/**
 * BRIDGE API Worker — email OTP via Resend.
 * OTP proof = signed token (no KV required). Optional OTP_KV for rate limits.
 *
 * Secrets: RESEND_API_KEY
 * Optional: OTP_FROM_EMAIL, OTP_SIGNING_SECRET, ALLOW_DEMO_OTP, OTP_KV
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.resend.com; base-uri 'self'; form-action 'self'",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...SECURITY_HEADERS },
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
  return String(1000 + (buf[0] % 9000));
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

async function makeToken(env, payload) {
  const secret = env.OTP_SIGNING_SECRET || env.RESEND_API_KEY;
  if (!secret) throw new Error("no_signing_secret");
  const body = b64urlJson(payload);
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

async function readToken(env, token) {
  const secret = env.OTP_SIGNING_SECRET || env.RESEND_API_KEY;
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
  if (!body?.email) return json({ ok: false, error: "bad_email" }, 400);
  const email = String(body.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "bad_email" }, 400);

  const lang = ["ru", "en", "tg"].includes(body.lang) ? body.lang : "ru";
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (env.OTP_KV) {
    const rateKey = `rate:${ip}`;
    const hits = Number((await env.OTP_KV.get(rateKey)) || "0");
    if (hits >= 8) return json({ ok: false, error: "rate_limited" }, 429);
    await env.OTP_KV.put(rateKey, String(hits + 1), { expirationTtl: 3600 });
  }

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
    exp,
  });

  const allowDemo = String(env.ALLOW_DEMO_OTP || "") === "true";
  const apiKey = env.RESEND_API_KEY;
  const from = env.OTP_FROM_EMAIL || "BRIDGE <onboarding@resend.dev>";

  if (!apiKey) {
    if (!allowDemo) return json({ ok: false, error: "email_not_configured" }, 503);
    return json({ ok: true, demo: true, code, token, expiresIn: ttl });
  }

  try {
    await sendResend({ apiKey, from, to: email, code, lang });
    return json({ ok: true, demo: false, token, expiresIn: ttl });
  } catch (e) {
    if (allowDemo) {
      return json({ ok: true, demo: true, code, token, expiresIn: ttl, warn: String(e.message || e) });
    }
    return json({ ok: false, error: "send_failed", detail: String(e.message || e) }, 502);
  }
}

async function handleOtpVerify(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.code) return json({ ok: false, error: "bad_request" }, 400);
  const email = String(body.email).trim().toLowerCase();
  const code = String(body.code).trim();
  if (!/^\d{4}$/.test(code)) return json({ ok: false, error: "bad_code" }, 400);

  const pending = await readToken(env, body.token);
  if (!pending) return json({ ok: false, error: "expired" }, 400);
  if (pending.email !== email) return json({ ok: false, error: "bad_code" }, 400);
  if (Date.now() > Number(pending.exp || 0)) return json({ ok: false, error: "expired" }, 400);

  const codeHash = await sha256(`${email}:${code}`);
  if (codeHash !== pending.codeHash) return json({ ok: false, error: "bad_code" }, 400);

  return json({
    ok: true,
    email,
    name: pending.name,
    country: pending.country,
    mode: pending.mode,
    consents: pending.consents,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { ...CORS, ...SECURITY_HEADERS } });

    if (url.pathname === "/api/otp/request" && request.method === "POST") {
      return handleOtpRequest(request, env);
    }
    if (url.pathname === "/api/otp/verify" && request.method === "POST") {
      return handleOtpVerify(request, env);
    }
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        emailConfigured: Boolean(env.RESEND_API_KEY),
        kv: Boolean(env.OTP_KV),
        demo: String(env.ALLOW_DEMO_OTP || "") === "true",
        mode: "signed-token",
      });
    }
    if (url.pathname === "/api/send-otp" && request.method === "POST") {
      return handleOtpRequest(request, env);
    }

    if (env.ASSETS) {
      const res = await env.ASSETS.fetch(request);
      return withSecurity(res);
    }
    return json({ ok: false, error: "not_found" }, 404);
  },
};
