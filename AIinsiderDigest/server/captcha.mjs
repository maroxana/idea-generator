export async function verifyTurnstile({ secret, token, remoteIp, allowBypass = false, fetchImpl = fetch }) {
  if (!secret) {
    return allowBypass
      ? { ok: true, reason: "captcha_bypassed" }
      : { ok: false, reason: "captcha_not_configured" };
  }

  if (!token) {
    return { ok: false, reason: "captcha_missing" };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);

  let response;
  try {
    response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
  } catch {
    return { ok: false, reason: "captcha_unreachable" };
  }

  if (!response.ok) {
    return { ok: false, reason: "captcha_http_error" };
  }

  const data = await response.json().catch(() => ({}));
  if (data && data.success) {
    return { ok: true, reason: "ok" };
  }

  return { ok: false, reason: "captcha_failed" };
}
