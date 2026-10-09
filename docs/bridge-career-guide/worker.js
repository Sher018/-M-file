/**
 * BRIDGE API Worker — email OTP via Resend + KV.
 * Static assets served through ASSETS binding.
 *
 * Required secrets/bindings (see EMAIL-OTP-SETUP.md):
 * - RESEND_API_KEY
 * - OTP_KV (KV namespace)
 * Optional vars:
 * - OTP_FROM_EMAIL (default: onboarding@resend.dev)
 * - ALLOW_DEMO_OTP=true (local only — returns code in JSON; never in prod)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
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
  const rateKey = `rate:${ip}`;
  if (env.OTP_KV) {
    const hits = Number((await env.OTP_KV.get(rateKey)) || "0");
    if (hits >= 8) return json({ ok: false, error: "rate_limited" }, 429);
    await env.OTP_KV.put(rateKey, String(hits + 1), { expirationTtl: 3600 });
  }

  const code = genCode();
  const codeHash = await sha256(`${email}:${code}`);
  const ttl = 600;
  if (env.OTP_KV) {
    await env.OTP_KV.put(
      `otp:${email}`,
      JSON.stringify({
        codeHash,
        name: body.name || "",
        country: body.country || "TJ",
        mode: body.mode || "login",
        consents: body.consents || null,
        createdAt: Date.now(),
      }),
      { expirationTtl: ttl }
    );
  }

  const allowDemo = String(env.ALLOW_DEMO_OTP || "") === "true";
  const apiKey = env.RESEND_API_KEY;
  const from = env.OTP_FROM_EMAIL || "BRIDGE <onboarding@resend.dev>";

  if (!apiKey) {
    if (!allowDemo) return json({ ok: false, error: "email_not_configured" }, 503);
    return json({ ok: true, demo: true, code, expiresIn: ttl });
  }

  try {
    await sendResend({ apiKey, from, to: email, code, lang });
    return json({ ok: true, demo: false, expiresIn: ttl });
  } catch (e) {
    if (allowDemo) return json({ ok: true, demo: true, code, expiresIn: ttl, warn: String(e.message || e) });
    return json({ ok: false, error: "send_failed", detail: String(e.message || e) }, 502);
  }
}

async function handleOtpVerify(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.code) return json({ ok: false, error: "bad_request" }, 400);
  const email = String(body.email).trim().toLowerCase();
  const code = String(body.code).trim();
  if (!/^\d{4}$/.test(code)) return json({ ok: false, error: "bad_code" }, 400);

  if (!env.OTP_KV) {
    // Static/demo path: client verified locally
    return json({ ok: true, local: true });
  }

  const raw = await env.OTP_KV.get(`otp:${email}`);
  if (!raw) return json({ ok: false, error: "expired" }, 400);
  const pending = JSON.parse(raw);
  const codeHash = await sha256(`${email}:${code}`);
  if (codeHash !== pending.codeHash) return json({ ok: false, error: "bad_code" }, 400);
  await env.OTP_KV.delete(`otp:${email}`);
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
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

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
      });
    }

    // legacy alias used by older client
    if (url.pathname === "/api/send-otp" && request.method === "POST") {
      return handleOtpRequest(request, env);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
