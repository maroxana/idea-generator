const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export function loadConfig(env = process.env) {
  return {
    port: toInt(env.PORT, 8787),
    allowedOrigin: env.SUBSCRIBE_ALLOWED_ORIGIN || "",
    buttondownApiKey: env.BUTTONDOWN_API_KEY || "",
    buttondownAudience: env.BUTTONDOWN_AUDIENCE || "roxmarie209",
    buttondownDoubleOptIn: toBool(env.BUTTONDOWN_DOUBLE_OPT_IN, true),
    perIpWindowMs: toInt(env.SUBSCRIBE_PER_IP_WINDOW_MS, 10 * 60 * 1000),
    perIpLimit: toInt(env.SUBSCRIBE_PER_IP_LIMIT, 8),
    // Allow up to 5 different subscribers per IP per hour (household/office friendly).
    perIpHourWindowMs: toInt(env.SUBSCRIBE_PER_IP_HOUR_WINDOW_MS, 60 * 60 * 1000),
    perIpHourLimit: toInt(env.SUBSCRIBE_PER_IP_HOUR_LIMIT, 5),
    perEmailCooldownMs: toInt(env.SUBSCRIBE_PER_EMAIL_COOLDOWN_MS, 10 * 60 * 1000),
    perFingerprintWindowMs: toInt(env.SUBSCRIBE_PER_FP_WINDOW_MS, 10 * 60 * 1000),
    perFingerprintLimit: toInt(env.SUBSCRIBE_PER_FP_LIMIT, 8),
    minSubmitMs: toInt(env.SUBSCRIBE_MIN_SUBMIT_MS, 1500),
    captchaSecret: env.TURNSTILE_SECRET_KEY || "",
    allowCaptchaBypass: toBool(env.SUBSCRIBE_ALLOW_CAPTCHA_BYPASS, false),
    logFilePath: env.SUBSCRIBE_AUDIT_LOG_PATH || "./logs/subscribe-audit.log"
  };
}
