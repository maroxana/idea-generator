---
applyTo: "**/*"
---

# AI Insider Digest — Build & AI Instructions

A practice project: a niche-specific, AI-curated weekly digest.

---

## Step 0: Pick Your Niche (do this first, don't skip)

The product only works if the niche is narrow enough that "AI news relevant to them" is a real filter, not just "AI news in general." Pick ONE:

| Niche | Why it could work |
|---|---|
| AI for Independent Recruiters | Clear pain (sourcing/screening), underserved, willing to pay |
| AI for Legal Tech / Small Law Firms | High compliance anxiety = high attention to updates |
| AI for E-commerce/DTC Operators | Practical tool releases (ads, customer service AI) drive interest |
| AI for Indie Hairdressers/Local Service Biz | Very underserved, but lower urgency — riskier |

**Recommendation:** The niche is `[AI for Independent Recruiters]` and the audience is `[IT contract recruiters]`.

---

## Step 1: Core AI System Prompt (Curation Engine)

This is the actual prompt that does the work. An API call once you automate.

```
You are an expert content curator producing a weekly digest for [IT contract recruiters]
working in [AI for Independent Recruiters]. You will be given a list of raw articles, headlines,
or links collected this week from AI/tech news sources.

Your task:
1. Select the 5–8 items most relevant and useful to [IT contract recruiters]. Reject:
   - Generic AI hype pieces with no practical takeaway
   - Duplicate stories already covered by another selected item
   - Anything older than 7 days
   - Pure opinion pieces with no news/product/research substance

2. For each selected item, write:
   - A headline (max 12 words, plain language, no clickbait)
   - A 2–3 sentence summary IN YOUR OWN WORDS (never copy source text)
   - One line titled "Why it matters to [IT contract recruiters]:" explaining the
     practical implication — a workflow change, a risk, an opportunity,
     or a tool to try

3. Order items by relevance/impact, most important first.

4. Tone: concise, professional, zero fluff, no exclamation points,
   no "game-changer"/"revolutionary" language.

5. Output format (markdown):

## [Headline]
[2–3 sentence summary]
**Why it matters to [IT contract recruiters]:** [one line]

---

Repeat for each item. End with a single-line closing: "That's this week's
digest — see you next [DAY]."

Source articles follow below, each with a title and link:
[PASTE YOUR COLLECTED LINKS/HEADLINES/SNIPPETS HERE]
```

**Important (copyright):** Always have the AI summarize in its own words — never paste full original article text into the output. Link to the source for readers who want more, but the value you're selling is the *curation and interpretation*, not the original reporting.

---

## Step 2: Weekly Workflow

1. **Collect:** Pull headlines from 5–8 sources relevant to the niche (a mix of general AI news sites + niche-specific blogs/subreddits/newsletters). Just copy titles + links into a text file.
2. **Curate:** Paste the collected list into the prompt. Review and lightly edit the output — fix anything inaccurate, sharpen the "why it matters" lines with your own judgment.
3. **Send:** Paste the finished digest into your email tool (start with **Beehiiv** or **Buttondown** — both have generous free tiers, built-in landing/signup pages, and basic analytics) and send to your list.

---

## Step 4: Build Brief — a simple website 

Build a lightweight site to professionalize sign-ups and create an archive.

```
Build a simple single-page website for a weekly AI news digest aimed at
[IT contract recruiters].

Pages:
1. Landing page:
   - Headline: clear value prop ("The weekly AI digest for [IT contract recruiters]")
   - 1–2 sentence subheading explaining what makes it different (curated,
     not generic AI news)
   - Email signup form (connect to [Beehiiv/Buttondown] API or embed
     their signup widget)
   - Preview of 1 sample past issue below the fold
   - Simple, clean design — no heavy animations, mobile responsive

2. Archive page:
   - List of past issues, newest first, each linking to its own page
   - Each issue page renders the markdown digest content nicely formatted

Tech preference: plain HTML/CSS/JS or Next.js if you're comfortable with
it — keep it as simple as possible, no backend database needed at this
stage since the email tool handles subscriber storage.

Do NOT build: user accounts, payment processing, or a CMS — add those
later only if needed.
```

---


