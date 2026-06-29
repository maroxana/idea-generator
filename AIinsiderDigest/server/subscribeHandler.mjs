import { buildFingerprint, getClientIp, makeIdempotencyKey, normalizeEmail, sanitizeText, validateEmail } from "./security.mjs";

const json = (status, payload, headers = {}) => ({
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...headers
  },
  body: JSON.stringify(payload)
});

export function createSubscribeHandler({ config, rateLimiter, buttondownClient, verifyCaptcha, auditLogger, now = () => Date.now() }) {
  const cache = new Map();

  return async function handle(input) {
    const ts = now();
    const method = input.method || "POST";

    if (method === "OPTIONS") {
      return json(204, {}, {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, x-request-id"
      });
    }

    if (method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }

    const headers = input.headers || {};
    const origin = headers.origin || headers.Origin || "";
    if (config.allowedOrigin && origin && origin !== config.allowedOrigin) {
      await auditLogger.log("rejected_origin", { origin });
      return json(403, { ok: false, error: "origin_not_allowed" });
    }

    const payload = input.body || {};
    const honeypot = sanitizeText(payload.hp || payload.website || "");
    const email = normalizeEmail(payload.email);
    const requestId = sanitizeText(headers["x-request-id"] || headers["X-Request-Id"] || payload.requestId || "");
    const startedAt = Number(payload.startedAt || 0);
    const captchaToken = sanitizeText(payload.captchaToken || "");

    const ip = getClientIp(headers, input.remoteAddress || "");
    const userAgent = sanitizeText(headers["user-agent"] || headers["User-Agent"] || "unknown");
    const acceptLanguage = sanitizeText(headers["accept-language"] || headers["Accept-Language"] || "");
    const fingerprint = buildFingerprint({
      ip,
      userAgent,
      acceptLanguage,
      suppliedFingerprint: sanitizeText(payload.fingerprint || "")
    });

    if (honeypot) {
      rateLimiter.markSuspiciousIp(ip, ts);
      await auditLogger.log("rejected_honeypot", { ip, email, fingerprint });
      return json(400, { ok: false, error: "blocked_request" });
    }

    const elapsed = startedAt > 0 ? ts - startedAt : 0;
    if (!Number.isFinite(elapsed) || elapsed < config.minSubmitMs) {
      rateLimiter.markSuspiciousIp(ip, ts);
      await auditLogger.log("rejected_too_fast", { ip, email, elapsed });
      return json(400, { ok: false, error: "verification_failed" });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      await auditLogger.log("rejected_email", { ip, email, reason: emailCheck.reason });
      return json(400, { ok: false, error: "invalid_email" });
    }

    const idempotencyKey = makeIdempotencyKey(requestId, email);
    const cached = cache.get(idempotencyKey);
    if (cached && ts - cached.at < config.perEmailCooldownMs) {
      return json(200, { ok: true, status: cached.status });
    }

    const rate = rateLimiter.check({ ip, email, fingerprint, now: ts });
    if (!rate.allowed) {
      await auditLogger.log("rate_limited", { ip, email, fingerprint, reason: rate.reason });
      return json(
        429,
        { ok: false, error: "rate_limited", reason: rate.reason },
        { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) }
      );
    }

    const captcha = await verifyCaptcha({
      secret: config.captchaSecret,
      token: captchaToken,
      remoteIp: ip,
      allowBypass: config.allowCaptchaBypass
    });
    if (!captcha.ok) {
      rateLimiter.markSuspiciousIp(ip, ts);
      await auditLogger.log("rejected_captcha", { ip, email, reason: captcha.reason });
      return json(400, { ok: false, error: "verification_failed" });
    }

    const result = await buttondownClient.subscribeOrIgnoreDuplicate({
      email,
      ip,
      userAgent,
      idempotencyKey
    });

    if (result.kind === "ok") {
      rateLimiter.markSuccessfulEmail(email, ts);
      cache.set(idempotencyKey, { at: ts, status: result.status });
      await auditLogger.log("subscribe_accepted", { ip, email, status: result.status });
      return json(200, {
        ok: true,
        status: result.status,
        message:
          result.status === "duplicate"
            ? "Email already subscribed. If needed, check your inbox for confirmation."
            : "Subscription request accepted. Please check your inbox to confirm."
      });
    }

    await auditLogger.log("buttondown_error", {
      ip,
      email,
      code: result.code,
      retryAfterSec: result.retryAfterSec || 0
    });

    if (result.code === "buttondown_rate_limited") {
      return json(
        429,
        { ok: false, error: "provider_rate_limited" },
        { "retry-after": String(result.retryAfterSec || 60) }
      );
    }

    return json(503, { ok: false, error: "provider_unavailable" });
  };
}
