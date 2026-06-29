import { createServer } from "node:http";
import { loadConfig } from "./config.mjs";
import { AuditLogger } from "./auditLog.mjs";
import { ButtondownClient } from "./buttondownClient.mjs";
import { verifyTurnstile } from "./captcha.mjs";
import { RateLimiter } from "./rateLimiter.mjs";
import { createSubscribeHandler } from "./subscribeHandler.mjs";

const config = loadConfig();
const auditLogger = new AuditLogger(config.logFilePath);
const rateLimiter = new RateLimiter(config);
const buttondownClient = new ButtondownClient({
  apiKey: config.buttondownApiKey,
  doubleOptIn: config.buttondownDoubleOptIn
});

const subscribe = createSubscribeHandler({
  config,
  rateLimiter,
  buttondownClient,
  verifyCaptcha: verifyTurnstile,
  auditLogger
});

function send(res, response, origin = "") {
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.statusCode = response.status;
  for (const [k, v] of Object.entries(response.headers || {})) {
    res.setHeader(k, v);
  }
  res.end(response.body || "");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolve(body);
      } catch {
        reject(new Error("invalid_json"));
      }
    });

    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || "";

  if (req.url === "/api/health") {
    send(
      res,
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: true })
      },
      origin
    );
    return;
  }

  if (req.url !== "/api/subscribe") {
    send(
      res,
      {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: false, error: "not_found" })
      },
      origin
    );
    return;
  }

  try {
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    const response = await subscribe({
      method: req.method,
      headers: req.headers,
      body,
      remoteAddress: req.socket.remoteAddress
    });
    send(res, response, origin);
  } catch (error) {
    const status = error.message === "payload_too_large" ? 413 : 400;
    send(
      res,
      {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: false, error: error.message || "bad_request" })
      },
      origin
    );
  }
});

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Subscribe service listening on http://localhost:${config.port}`);
});
