const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(value) {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) ? n : 60;
}

export class ButtondownClient {
  constructor({ apiKey, doubleOptIn = true, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.doubleOptIn = doubleOptIn;
    this.fetchImpl = fetchImpl;
  }

  async subscribeOrIgnoreDuplicate({ email, ip, userAgent, idempotencyKey }) {
    if (!this.apiKey) {
      return { kind: "error", code: "buttondown_not_configured" };
    }

    const payload = {
      email,
      metadata: {
        signup_ip: ip,
        user_agent: userAgent
      },
      notes: "Subscribed via AI Insider Digest website",
      double_opt_in: this.doubleOptIn
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let res;
      try {
        res = await this.fetchImpl("https://api.buttondown.email/v1/subscribers", {
          method: "POST",
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify(payload)
        });
      } catch {
        if (attempt === maxAttempts) return { kind: "error", code: "buttondown_network_error" };
        await sleep(100 * attempt);
        continue;
      }

      const raw = await res.text();
      const body = raw ? raw.toLowerCase() : "";

      if (res.ok) return { kind: "ok", status: "created" };
      if (res.status === 409 || body.includes("already") || body.includes("exists")) {
        return { kind: "ok", status: "duplicate" };
      }
      if (res.status === 429) {
        return {
          kind: "error",
          code: "buttondown_rate_limited",
          retryAfterSec: parseRetryAfter(res.headers.get("retry-after"))
        };
      }

      if (res.status >= 500 && attempt < maxAttempts) {
        await sleep(150 * attempt);
        continue;
      }

      return { kind: "error", code: "buttondown_rejected", details: raw.slice(0, 280) };
    }

    return { kind: "error", code: "buttondown_unknown_error" };
  }
}
