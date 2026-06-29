import { createHash, randomUUID } from "node:crypto";

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com"
]);

export function sanitizeText(value = "") {
  return String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function normalizeEmail(value = "") {
  return sanitizeText(value).toLowerCase();
}

export function validateEmail(email) {
  if (!EMAIL_REGEX.test(email)) return { ok: false, reason: "invalid_format" };
  const domain = email.split("@")[1] || "";
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: "disposable_domain" };
  return { ok: true, reason: "ok" };
}

export function getClientIp(headers = {}, remoteAddress = "") {
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return remoteAddress || "unknown";
}

export function buildFingerprint({ ip, userAgent = "", acceptLanguage = "", suppliedFingerprint = "" }) {
  if (suppliedFingerprint && suppliedFingerprint.length >= 8) return suppliedFingerprint.slice(0, 128);
  const raw = `${ip}|${userAgent}|${acceptLanguage}`;
  return createHash("sha256").update(raw).digest("hex");
}

export function makeIdempotencyKey(requestId, email) {
  const normalizedId = sanitizeText(requestId) || randomUUID();
  return createHash("sha256").update(`${normalizedId}:${email}`).digest("hex");
}
