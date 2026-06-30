/**
 * AI Insider Digest — subscribe Worker (Cloudflare).
 *
 * Self-contained: paste-and-deploy. Keeps the same anti-abuse protections as the
 * Node server (per-IP hourly limit, per-email cooldown, honeypot, submit-timing
 * check, strict validation, optional Turnstile CAPTCHA, safe Buttondown calls).
 *
 * Required bindings / secrets (see wrangler.toml and README.md):
 *   - KV namespace binding:  RATE_LIMIT   (durable rate limiting)
 *   - Secret:                BUTTONDOWN_API_KEY
 * Optional:
 *   - Secret:                TURNSTILE_SECRET_KEY  (enables CAPTCHA enforcement)
 *   - Vars:                  ALLOWED_ORIGIN, PER_IP_HOUR_LIMIT, PER_EMAIL_COOLDOWN_SEC,
 *                            MIN_SUBMIT_MS, DOUBLE_OPT_IN
 */

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com"
]);

function num(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function loadConfig(env) {
  return {
    allowedOrigin: env.ALLOWED_ORIGIN || "",
    buttondownApiKey: env.BUTTONDOWN_API_KEY || "",
    doubleOptIn: bool(env.DOUBLE_OPT_IN, true),
    perIpHourLimit: num(env.PER_IP_HOUR_LIMIT, 5),
    perEmailCooldownSec: num(env.PER_EMAIL_COOLDOWN_SEC, 600),
    minSubmitMs: num(env.MIN_SUBMIT_MS, 1500),
    captchaSecret: env.TURNSTILE_SECRET_KEY || ""
  };
}

function corsHeaders(origin, allowedOrigin) {
  // If ALLOWED_ORIGIN is set, only echo it back; otherwise reflect the caller.
  const allow = allowedOrigin ? allowedOrigin : origin || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-request-id"
  };
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders }
  });
}

function sanitize(value = "") {
  return String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function validateEmail(email) {
  if (!EMAIL_REGEX.test(email)) return { ok: false, reason: "invalid_format" };
  const domain = email.split("@")[1] || "";
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: "disposable_domain" };
  return { ok: true };
}

async function verifyTurnstile(secret, token, ip) {
  if (!secret) return { ok: true, reason: "captcha_disabled" };
  if (!token) return { ok: false, reason: "captcha_missing" };

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  let res;
  try {
    res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
  } catch {
    return { ok: false, reason: "captcha_unreachable" };
  }

  const data = await res.json().catch(() => ({}));
  return data && data.success ? { ok: true } : { ok: false, reason: "captcha_failed" };
}

/**
 * Durable rate limiting via KV.
 * - Per-IP: count within a rolling hour; block when over limit.
 * - Per-email: cooldown key with TTL; reject while present.
 * KV ops are not atomic, so this is best-effort (sufficient for signup abuse).
 */
async function checkRateLimits(kv, { ip, email, config }) {
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${email}`;

  const emailHit = await kv.get(emailKey);
  if (emailHit) {
    return { allowed: false, reason: "email_cooldown", retryAfterSec: config.perEmailCooldownSec };
  }

  const currentRaw = await kv.get(ipKey);
  const current = num(currentRaw, 0);
  if (current >= config.perIpHourLimit) {
    return { allowed: false, reason: "ip_hour_limit", retryAfterSec: 3600 };
  }

  return { allowed: true, current };
}

async function recordSuccess(kv, { ip, email, current, config }) {
  // Increment IP counter (preserve the hour TTL on first write).
  await kv.put(`ip:${ip}`, String(current + 1), { expirationTtl: 3600 });
  // Set email cooldown.
  await kv.put(`email:${email}`, "1", { expirationTtl: config.perEmailCooldownSec });
}

async function recordSuspicious(kv, ip) {
  // Bump the IP counter so repeated bad attempts trip the hourly limit faster.
  const current = num(await kv.get(`ip:${ip}`), 0);
  await kv.put(`ip:${ip}`, String(current + 1), { expirationTtl: 3600 });
}

async function subscribeToButtondown({ apiKey, email, ip, userAgent, doubleOptIn, idempotencyKey }) {
  if (!apiKey) return { kind: "error", code: "buttondown_not_configured" };

  const payload = {
    email,
    metadata: { signup_ip: ip, user_agent: userAgent },
    notes: "Subscribed via AI Insider Digest website",
    double_opt_in: doubleOptIn
  };

  let res;
  try {
    res = await fetch("https://api.buttondown.email/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });
  } catch {
    return { kind: "error", code: "buttondown_network_error" };
  }

  const raw = await res.text();
  const body = raw ? raw.toLowerCase() : "";

  if (res.ok) return { kind: "ok", status: "created" };
  if (res.status === 409 || body.includes("already") || body.includes("exists")) {
    return { kind: "ok", status: "duplicate" };
  }
  if (res.status === 429) {
    return { kind: "error", code: "buttondown_rate_limited", retryAfterSec: num(res.headers.get("retry-after"), 60) };
  }
  return { kind: "error", code: "buttondown_rejected", details: raw.slice(0, 280) };
}

export default {
  async fetch(request, env) {
    const config = loadConfig(env);
    const origin = request.headers.get("origin") || "";
    const cors = corsHeaders(origin, config.allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return json(200, { ok: true }, cors);
    }
    if (url.pathname !== "/api/subscribe") {
      return json(404, { ok: false, error: "not_found" }, cors);
    }
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" }, cors);
    }

    if (config.allowedOrigin && origin && origin !== config.allowedOrigin) {
      return json(403, { ok: false, error: "origin_not_allowed" }, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { ok: false, error: "invalid_json" }, cors);
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = sanitize(request.headers.get("user-agent") || "unknown");
    const requestId = sanitize(request.headers.get("x-request-id") || crypto.randomUUID());

    const honeypot = sanitize(payload.hp || payload.website || "");
    const email = sanitize(payload.email).toLowerCase();
    const startedAt = Number(payload.startedAt || 0);
    const captchaToken = sanitize(payload.captchaToken || "");
    const kv = env.RATE_LIMIT;

    // 1) Honeypot.
    if (honeypot) {
      if (kv) await recordSuspicious(kv, ip);
      return json(400, { ok: false, error: "blocked_request" }, cors);
    }

    // 2) Submit timing (scripted/too-fast).
    const elapsed = startedAt > 0 ? Date.now() - startedAt : 0;
    if (!Number.isFinite(elapsed) || elapsed < config.minSubmitMs) {
      if (kv) await recordSuspicious(kv, ip);
      return json(400, { ok: false, error: "verification_failed" }, cors);
    }

    // 3) Email validation.
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return json(400, { ok: false, error: "invalid_email" }, cors);
    }

    // 4) Rate limits (durable via KV; if KV missing, skip but still proceed).
    if (kv) {
      const rate = await checkRateLimits(kv, { ip, email, config });
      if (!rate.allowed) {
        if (kv) await recordSuspicious(kv, ip);
        return json(
          429,
          { ok: false, error: "rate_limited", reason: rate.reason },
          { ...cors, "retry-after": String(rate.retryAfterSec) }
        );
      }
      payload.__ipCurrent = rate.current;
    }

    // 5) CAPTCHA (only enforced if a secret is configured).
    const captcha = await verifyTurnstile(config.captchaSecret, captchaToken, ip);
    if (!captcha.ok) {
      if (kv) await recordSuspicious(kv, ip);
      return json(400, { ok: false, error: "verification_failed" }, cors);
    }

    // 6) Buttondown (idempotent, duplicate-safe).
    const result = await subscribeToButtondown({
      apiKey: config.buttondownApiKey,
      email,
      ip,
      userAgent,
      doubleOptIn: config.doubleOptIn,
      idempotencyKey: requestId
    });

    if (result.kind === "ok") {
      if (kv) {
        await recordSuccess(kv, { ip, email, current: num(payload.__ipCurrent, 0), config });
      }
      return json(
        200,
        {
          ok: true,
          status: result.status,
          message:
            result.status === "duplicate"
              ? "Email already subscribed. Check your inbox if you still need to confirm."
              : "Subscription request accepted. Please check your inbox to confirm."
        },
        cors
      );
    }

    if (result.code === "buttondown_rate_limited") {
      return json(
        429,
        { ok: false, error: "provider_rate_limited" },
        { ...cors, "retry-after": String(result.retryAfterSec || 60) }
      );
    }

    return json(503, { ok: false, error: "provider_unavailable" }, cors);
  }
};
