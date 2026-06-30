# AI Insider Digest — Subscribe Worker (Cloudflare)

A free, self-contained backend for the newsletter signup form. GitHub Pages is
static and cannot run a Node server, so this Worker provides the `/api/subscribe`
endpoint with all the anti-abuse protections:

- Per-IP hourly limit (different emails from the same IP are allowed)
- Per-email cooldown
- Honeypot + submit-timing bot checks
- Strict email validation + disposable-domain block
- Optional Cloudflare Turnstile CAPTCHA
- Safe, idempotent, duplicate-tolerant Buttondown integration

## One-time deploy

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

```powershell
cd AIinsiderDigest/worker

# 1. Log in (opens browser)
npx wrangler login

# 2. Create the KV namespace for rate limiting
npx wrangler kv namespace create RATE_LIMIT
#   -> copy the printed id into wrangler.toml under [[kv_namespaces]] id = "..."

# 3. Add your Buttondown API key (find it in Buttondown > Settings > API)
npx wrangler secret put BUTTONDOWN_API_KEY

# 4. (Optional) enable CAPTCHA — add the Turnstile secret key
npx wrangler secret put TURNSTILE_SECRET_KEY

# 5. Deploy
npx wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g.:

```
https://ai-insider-digest-subscribe.YOUR-SUBDOMAIN.workers.dev
```

## Connect the website

In `AIinsiderDigest/index.html`, set the meta tag to your Worker URL + `/api/subscribe`:

```html
<meta name="subscribe-api-url" content="https://ai-insider-digest-subscribe.YOUR-SUBDOMAIN.workers.dev/api/subscribe">
```

Commit and push. GitHub Pages will redeploy and the form will post to the Worker.

## Optional: enable CAPTCHA on the page

If you set `TURNSTILE_SECRET_KEY` above, also add your Turnstile **site key** to
`AIinsiderDigest/index.html`:

```html
<meta name="turnstile-sitekey" content="YOUR_TURNSTILE_SITE_KEY">
```

## Quick test

```powershell
curl -X POST "https://YOUR-WORKER-URL/api/subscribe" `
  -H "content-type: application/json" `
  -d '{"email":"you@example.com","hp":"","startedAt":0,"captchaToken":""}'
```

A `startedAt` of `0` will be rejected as too-fast (expected) — the real form
sends a timestamp. Use `/api/health` to confirm the Worker is live:

```powershell
curl "https://YOUR-WORKER-URL/api/health"
```
