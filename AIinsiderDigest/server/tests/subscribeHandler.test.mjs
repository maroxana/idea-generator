import test from "node:test";
import assert from "node:assert/strict";
import { createSubscribeHandler } from "../subscribeHandler.mjs";
import { RateLimiter } from "../rateLimiter.mjs";

function makeDeps(overrides = {}) {
  const nowValue = { value: 1_700_000_000_000 };
  const config = {
    allowedOrigin: "",
    captchaSecret: "",
    allowCaptchaBypass: true,
    minSubmitMs: 1500,
    perIpHourLimit: 5,
    perIpHourWindowMs: 3_600_000,
    perEmailCooldownMs: 120_000,
    perFingerprintLimit: 5,
    perFingerprintWindowMs: 60_000
  };

  const logs = [];
  const calls = [];

  const handler = createSubscribeHandler({
    config,
    rateLimiter: new RateLimiter(config),
    buttondownClient: {
      async subscribeOrIgnoreDuplicate(data) {
        calls.push(data);
        return { kind: "ok", status: "created" };
      }
    },
    verifyCaptcha: async () => ({ ok: true }),
    auditLogger: { async log(event, details) { logs.push({ event, details }); } },
    now: () => nowValue.value,
    ...overrides
  });

  return { handler, nowValue, logs, calls };
}

function baseInput(body = {}, headerOverrides = {}) {
  return {
    method: "POST",
    headers: {
      "user-agent": "test-agent",
      "accept-language": "en-US",
      "x-forwarded-for": "203.0.113.10",
      "x-request-id": "req-1",
      ...headerOverrides
    },
    body: {
      email: "valid@example.com",
      startedAt: 1_699_999_998_000,
      hp: "",
      captchaToken: "token",
      ...body
    },
    remoteAddress: "203.0.113.10"
  };
}

test("rejects honeypot submissions", async () => {
  const { handler } = makeDeps();
  const response = await handler(baseInput({ hp: "bot-filled" }));
  assert.equal(response.status, 400);
  const payload = JSON.parse(response.body);
  assert.equal(payload.error, "blocked_request");
});

test("applies email cooldown and returns 429", async () => {
  const { handler, nowValue } = makeDeps();

  const first = await handler(baseInput());
  assert.equal(first.status, 200);

  nowValue.value += 30_000;
  const second = await handler(baseInput({}, { "x-request-id": "req-2" }));
  assert.equal(second.status, 429);
  assert.equal(JSON.parse(second.body).error, "rate_limited");
});

test("returns cached idempotent result for repeated request id", async () => {
  const { handler, calls } = makeDeps();

  const first = await handler(baseInput({ requestId: "same-id" }));
  const second = await handler(baseInput({ requestId: "same-id" }));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(calls.length, 1);
});

test("rejects malformed email", async () => {
  const { handler } = makeDeps();
  const response = await handler(baseInput({ email: "not-an-email" }));
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, "invalid_email");
});

test("allows different emails from the same IP within hourly limit", async () => {
  const { handler, nowValue } = makeDeps();

  const first = await handler(baseInput({ email: "alice@example.com", requestId: "r1" }, { "x-request-id": "r1" }));
  assert.equal(first.status, 200, "first subscriber should be accepted");

  nowValue.value += 5_000;
  const second = await handler(baseInput({ email: "bob@example.com", requestId: "r2" }, { "x-request-id": "r2" }));
  assert.equal(second.status, 200, "different email from same IP should be accepted");
});

test("blocks same IP after exceeding hourly limit", async () => {
  const { handler, nowValue } = makeDeps();
  const emails = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"];

  for (const email of emails) {
    nowValue.value += 5_000;
    await handler(baseInput({ email, requestId: email }, { "x-request-id": email }));
  }

  nowValue.value += 5_000;
  const over = await handler(baseInput({ email: "f@x.com", requestId: "f" }, { "x-request-id": "f" }));
  assert.equal(over.status, 429, "6th unique email from same IP within 1h should be blocked");
});
