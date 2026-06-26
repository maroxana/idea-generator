// Weekly AI Insider Digest automation.
//
// Pipeline:
//   1. Read source feeds from feeds.json
//   2. Fetch each RSS/Atom feed, keep items from the last 7 days
//   3. Ask an LLM to curate the 5-8 most useful items for the audience
//   4. Render a new issue HTML page that matches the existing template
//   5. Prepend the issue to the archive page
//   6. Create/send a Buttondown email from the same content
//
// LLM provider (env LLM_PROVIDER):
//   "github"    - GitHub Models, free with GITHUB_TOKEN in Actions (default)
//   "anthropic" - Anthropic Claude (paid, needs ANTHROPIC_API_KEY)
//
// Env vars:
//   GITHUB_TOKEN        - provided automatically in GitHub Actions (needs `models: read` permission)
//   GITHUB_MODEL        - default "openai/gpt-4o-mini"
//   ANTHROPIC_API_KEY   - only needed when LLM_PROVIDER=anthropic
//   ANTHROPIC_MODEL     - default "claude-3-5-sonnet-latest"
//   BUTTONDOWN_API_KEY  - Buttondown API key (optional; email step skipped if absent)
//   BUTTONDOWN_BASE     - default "https://api.buttondown.email"
//   BUTTONDOWN_STATUS   - "draft" (default) or "sent"

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DIGEST_DIR = path.join(REPO_ROOT, "AIinsiderDigest");
const ISSUES_DIR = path.join(DIGEST_DIR, "issues");
const ARCHIVE_FILE = path.join(DIGEST_DIR, "archive.html");
const FEEDS_FILE = path.join(__dirname, "feeds.json");

const AUDIENCE = "IT contract recruiters";
const NICHE = "AI for Independent Recruiters";
const SEND_DAY = "Monday";
const CANONICAL_BASE = "https://maroxana.github.io/idea-generator/AIinsiderDigest";

const LLM_PROVIDER = (process.env.LLM_PROVIDER || "github").toLowerCase();

// GitHub Models (free with the built-in token in Actions)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_MODELS_ENDPOINT =
  process.env.GITHUB_MODELS_ENDPOINT || "https://models.github.ai/inference/chat/completions";
const GITHUB_MODEL = process.env.GITHUB_MODEL || "openai/gpt-4o-mini";

// Anthropic (paid alternative)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_BASE = process.env.BUTTONDOWN_BASE || "https://api.buttondown.email";
const BUTTONDOWN_STATUS = process.env.BUTTONDOWN_STATUS || "draft";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escAttr = (s) => escHtml(s).replace(/"/g, "&quot;");

async function collectItems() {
  const cfg = JSON.parse(await fs.readFile(FEEDS_FILE, "utf8"));
  const parser = new Parser({ timeout: 15000 });
  const cutoff = Date.now() - WEEK_MS;
  const collected = [];

  for (const group of cfg.groups ?? []) {
    for (const url of group.feeds ?? []) {
      try {
        const feed = await parser.parseURL(url);
        let perFeed = 0;
        for (const item of feed.items ?? []) {
          const raw = item.isoDate || item.pubDate;
          const when = raw ? Date.parse(raw) : NaN;
          if (!Number.isNaN(when) && when < cutoff) continue;
          if (!item.title || !item.link) continue;
          collected.push({
            title: item.title.trim(),
            link: item.link.trim(),
            source: (feed.title || group.name || "").trim(),
            snippet: (item.contentSnippet || "").replace(/\s+/g, " ").slice(0, 280).trim(),
          });
          if (++perFeed >= 10) break;
        }
      } catch (err) {
        console.warn(`Skipping feed (${url}): ${err.message}`);
      }
    }
  }

  const seen = new Set();
  const unique = [];
  for (const item of collected) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.slice(0, 50);
}

function buildSystemPrompt() {
  return `You are an expert content curator producing a weekly digest for ${AUDIENCE} working in ${NICHE}. You will be given a list of raw articles collected this week from AI/tech and recruiting news sources.

Your task:
1. Select the 5-8 items most relevant and useful to ${AUDIENCE}. Reject:
   - Generic AI hype pieces with no practical takeaway
   - Duplicate stories already covered by another selected item
   - Anything not clearly within the last 7 days
   - Pure opinion pieces with no news/product/research substance
   If fewer than 5 items qualify, return only the ones that genuinely qualify.

2. For each selected item, write:
   - A headline (max 12 words, plain language, no clickbait)
   - A 2-3 sentence summary IN YOUR OWN WORDS (never copy source text)
   - One line "Why it matters to ${AUDIENCE}:" explaining the practical implication
   - One line "Source:" containing the exact original article URL provided to you

3. Order items by relevance/impact, most important first.

4. Tone: concise, professional, zero fluff, no exclamation points, no "game-changer"/"revolutionary" language.

5. Output format EXACTLY as follows. Start with two metadata lines, then a blank line, then the items:

TITLE: a short archive title for this issue, max 8 words
TEASER: one sentence describing this issue, max 20 words

## [Headline]
[2-3 sentence summary]
**Why it matters to ${AUDIENCE}:** [one line]
Source: [original article URL]

---

(repeat the block above for each selected item, separated by a line containing only ---)

End with a single closing line, on its own, after the last item:
That's this week's digest — see you next ${SEND_DAY}.

Do not output anything else (no preamble, no markdown code fences).`;
}

async function curate(items) {
  const list = items
    .map(
      (it, i) =>
        `${i + 1}. ${it.title}\n   URL: ${it.link}\n   Source: ${it.source}\n   Snippet: ${it.snippet}`
    )
    .join("\n\n");

  const system = buildSystemPrompt();
  const user = `Here are this week's collected articles. Curate the digest now.\n\n${list}`;

  if (LLM_PROVIDER === "anthropic") return callAnthropic(system, user);
  return callGitHubModels(system, user);
}

async function callGitHubModels(system, user) {
  if (!GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is required for the GitHub Models provider (it is provided automatically in GitHub Actions)."
    );
  }
  const res = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      model: GITHUB_MODEL,
      temperature: 0.4,
      max_tokens: 2000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub Models API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

async function callAnthropic(system, user) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for the Anthropic provider.");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.content ?? []).map((c) => c.text || "").join("").trim();
}

function parseDigest(markdown) {
  let title = "AI Insider Digest";
  let teaser = `This week's curated AI updates for ${AUDIENCE}.`;

  const titleMatch = markdown.match(/^\s*TITLE:\s*(.+)$/m);
  const teaserMatch = markdown.match(/^\s*TEASER:\s*(.+)$/m);
  if (titleMatch) title = titleMatch[1].trim();
  if (teaserMatch) teaser = teaserMatch[1].trim();

  let body = markdown
    .replace(/^\s*TITLE:.*$/m, "")
    .replace(/^\s*TEASER:.*$/m, "")
    .trim();

  let closing = `That's this week's digest — see you next ${SEND_DAY}.`;
  const closingMatch = body.match(/^.*this week'?s digest[^\n]*$/im);
  if (closingMatch) {
    closing = closingMatch[0].trim();
    body = body.replace(closingMatch[0], "").trim();
  }

  const blocks = body
    .split(/\n\s*-{3,}\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const items = [];
  for (const block of blocks) {
    const headline = (block.match(/^##\s+(.+)$/m) || [])[1]?.trim();
    if (!headline) continue;
    const why = (block.match(/^\*\*Why it matters[^:]*:\*\*\s*(.+)$/im) || [])[1]?.trim() || "";
    const source = (block.match(/^Source:\s*(\S+)/im) || [])[1]?.trim() || "";
    const summary = block
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        return (
          t &&
          !t.startsWith("##") &&
          !/^\*\*Why it matters/i.test(t) &&
          !/^Source:/i.test(t)
        );
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    items.push({ headline, summary, why, source });
  }

  return { title, teaser, closing, items, body };
}

async function nextIssueNumber() {
  let max = 0;
  const files = await fs.readdir(ISSUES_DIR);
  for (const file of files) {
    if (!file.endsWith(".html")) continue;
    const content = await fs.readFile(path.join(ISSUES_DIR, file), "utf8");
    const m = content.match(/Issue\s+0*(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function renderIssueHtml({ issueNumStr, human, iso, items, closing }) {
  const articles = items
    .map((it, idx) => {
      const parts = [];
      parts.push(`      <h2>${escHtml(it.headline)}</h2>`);
      if (it.summary) parts.push(`      <p>${escHtml(it.summary)}</p>`);
      if (it.why) {
        parts.push(
          `      <p><strong>Why it matters to ${AUDIENCE}:</strong> ${escHtml(it.why)}</p>`
        );
      }
      if (it.source) {
        parts.push(
          `      <p class="issue-source"><a class="text-link" href="${escAttr(it.source)}" rel="noopener" target="_blank">Read the source &rarr;</a></p>`
        );
      }
      if (idx < items.length - 1) parts.push(`      <hr class="separator">`);
      return parts.join("\n");
    })
    .join("\n\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Issue ${issueNumStr} | AI Insider Digest</title>
  <meta name="description" content="Issue ${issueNumStr} of AI Insider Digest for IT contract recruiters.">
  <meta name="theme-color" content="#f4efe6">
  <link rel="canonical" href="${CANONICAL_BASE}/issues/${iso}.html">
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <header class="site-header container">
    <a class="brand" href="../">AI Insider Digest</a>
    <nav>
      <a href="../archive.html">Archive</a>
    </nav>
  </header>

  <main class="issue container">
    <p class="eyebrow">Issue ${issueNumStr}</p>
    <h1>Weekly Digest • ${human}</h1>

    <article class="issue-content">
${articles}

      <p><em>${escHtml(closing)}</em></p>
    </article>

    <p><a class="button-link" href="../archive.html">Back to archive</a></p>
  </main>
</body>
</html>
`;
}

async function updateArchive({ issueNumStr, human, iso, title, teaser }) {
  const archive = await fs.readFile(ARCHIVE_FILE, "utf8");
  const anchor = '<ul class="archive-list">';
  if (!archive.includes(anchor)) {
    throw new Error("Could not find archive list anchor in archive.html");
  }
  const entry = `
      <li>
        <p class="issue-meta">Issue ${issueNumStr} • ${human}</p>
        <h3><a href="issues/${iso}.html">${escHtml(title)}</a></h3>
        <p>${escHtml(teaser)}</p>
      </li>`;
  const updated = archive.replace(anchor, anchor + entry);
  await fs.writeFile(ARCHIVE_FILE, updated);
}

async function createButtondownDraft({ title, body, closing }) {
  if (!BUTTONDOWN_API_KEY) {
    console.warn("No BUTTONDOWN_API_KEY set; skipping email.");
    return;
  }
  // Buttondown accepts these statuses when creating an email. "sent" is not one
  // of them; to send immediately you create the email as "about_to_send".
  const aliases = { sent: "about_to_send", send: "about_to_send" };
  const status = aliases[BUTTONDOWN_STATUS] || BUTTONDOWN_STATUS;

  const emailBody = `${body}\n\n---\n\n${closing}`;
  const res = await fetch(`${BUTTONDOWN_BASE}/v1/emails`, {
    method: "POST",
    headers: {
      Authorization: `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subject: title, body: emailBody, status }),
  });
  if (!res.ok) {
    console.warn(`Buttondown API ${res.status}: ${await res.text()}`);
    return;
  }
  console.log(`Buttondown email created with status "${status}".`);
}

async function main() {
  if (LLM_PROVIDER === "anthropic" && !ANTHROPIC_API_KEY) {
    fail("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.");
  }
  if (LLM_PROVIDER === "github" && !GITHUB_TOKEN) {
    fail("GITHUB_TOKEN is required when LLM_PROVIDER=github (provided automatically in GitHub Actions).");
  }
  console.log(`Using LLM provider: ${LLM_PROVIDER}`);

  console.log("Collecting source items...");
  const items = await collectItems();
  console.log(`Collected ${items.length} candidate items from the last 7 days.`);
  if (items.length === 0) fail("No items found in any feed; nothing to curate.");

  console.log(`Curating with ${LLM_PROVIDER}...`);
  const markdown = await curate(items);
  const digest = parseDigest(markdown);
  if (digest.items.length === 0) {
    fail("Curation returned no usable items. Raw model output:\n" + markdown);
  }
  console.log(`Curated ${digest.items.length} items: ${digest.title}`);

  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const human = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const issueNum = await nextIssueNumber();
  const issueNumStr = String(issueNum).padStart(3, "0");

  const html = renderIssueHtml({
    issueNumStr,
    human,
    iso,
    items: digest.items,
    closing: digest.closing,
  });
  const issuePath = path.join(ISSUES_DIR, `${iso}.html`);
  await fs.writeFile(issuePath, html);
  console.log(`Wrote ${path.relative(REPO_ROOT, issuePath)}`);

  await updateArchive({
    issueNumStr,
    human,
    iso,
    title: digest.title,
    teaser: digest.teaser,
  });
  console.log("Updated archive.html");

  await createButtondownDraft({
    title: `${digest.title} — Issue ${issueNumStr}`,
    body: digest.body,
    closing: digest.closing,
  });

  console.log("Done.");
}

main().catch((err) => fail(err.stack || err.message));
