const SITE_TURNSTILE_KEY =
  document.querySelector('meta[name="turnstile-sitekey"]')?.getAttribute("content")?.trim() || "";

function setMessage(messageEl, text, type = "") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.classList.remove("is-success", "is-error");
  if (type) messageEl.classList.add(type);
}

async function buildFingerprint() {
  const source = [
    navigator.userAgent || "",
    navigator.language || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    String(screen.width || ""),
    String(screen.height || "")
  ].join("|");

  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function attachCaptcha(form) {
  const container = form.querySelector("#captchaContainer");
  const tokenField = form.querySelector("#captchaToken");
  if (!container || !tokenField) return;

  if (!SITE_TURNSTILE_KEY || !window.turnstile) {
    tokenField.value = "";
    container.hidden = true;
    return;
  }

  container.hidden = false;
  window.turnstile.render(container, {
    sitekey: SITE_TURNSTILE_KEY,
    callback: (token) => {
      tokenField.value = token;
    },
    "expired-callback": () => {
      tokenField.value = "";
    },
    "error-callback": () => {
      tokenField.value = "";
    }
  });
}

async function submitSubscription(form) {
  const endpoint = form.dataset.subscribeEndpoint || "/api/subscribe";
  const email = form.querySelector('input[name="email"]')?.value.trim() || "";
  const honeypot = form.querySelector('input[name="hp"]')?.value.trim() || "";
  const startedAt = Number(form.querySelector("#startedAt")?.value || "0");
  const fingerprint = form.querySelector("#fingerprint")?.value || "";
  const captchaToken = form.querySelector("#captchaToken")?.value || "";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID()
    },
    body: JSON.stringify({
      email,
      hp: honeypot,
      startedAt,
      fingerprint,
      captchaToken
    })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  return { response, payload };
}

function initSubscribe() {
  const form = document.querySelector(".signup-form");
  if (!form) return;

  const message = document.getElementById("formMessage");
  const submitBtn = form.querySelector('button[type="submit"]');
  const startedAt = form.querySelector("#startedAt");
  const fingerprintField = form.querySelector("#fingerprint");

  if (startedAt) {
    startedAt.value = String(Date.now());
  }

  buildFingerprint()
    .then((fp) => {
      if (fingerprintField) fingerprintField.value = fp;
    })
    .catch(() => {
      if (fingerprintField) fingerprintField.value = "";
    });

  attachCaptcha(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!submitBtn) return;

    submitBtn.disabled = true;
    setMessage(message, "Submitting subscription request...");

    try {
      const { response, payload } = await submitSubscription(form);

      if (response.ok) {
        setMessage(
          message,
          payload.message || "Subscription request accepted. Check your inbox for confirmation.",
          "is-success"
        );
        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
        if (fingerprintField) {
          fingerprintField.value = await buildFingerprint().catch(() => "");
        }
        const captchaToken = form.querySelector("#captchaToken");
        if (captchaToken) captchaToken.value = "";
      } else if (response.status === 429) {
        setMessage(message, "Too many attempts. Please wait and try again.", "is-error");
      } else {
        setMessage(message, "Request blocked. Please verify details and try again.", "is-error");
      }
    } catch {
      setMessage(message, "Service temporarily unavailable. Please try again shortly.", "is-error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", initSubscribe);
