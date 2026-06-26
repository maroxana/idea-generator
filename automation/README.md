# Weekly Digest Automation

Automates the AI Insider Digest weekly workflow: collect → curate → publish → email draft.

## What runs

[`.github/workflows/weekly-digest.yml`](../.github/workflows/weekly-digest.yml) runs every **Monday at 08:00 UTC** (and on-demand via *Actions → Weekly Digest → Run workflow*). It executes [`generate-digest.mjs`](generate-digest.mjs), which:

1. Reads the source feeds in [`feeds.json`](feeds.json).
2. Fetches each RSS/Atom feed and keeps items from the last 7 days (feeds that fail to load are skipped).
3. Sends the candidates to an LLM (free **GitHub Models** by default) using the curation prompt and the audience/niche from the project instructions.
4. Generates a new issue page at `AIinsiderDigest/issues/YYYY-MM-DD.html` (matching the existing template).
5. Prepends the issue to `AIinsiderDigest/archive.html`.
6. Creates a **Buttondown email draft** from the same content.
7. Commits and pushes the new issue + archive, which publishes them to GitHub Pages.

## Required setup (one time)

By default the workflow curates with **GitHub Models**, which is free and authenticates with the built-in `GITHUB_TOKEN` — so **no AI API key is required**. You only optionally add a Buttondown key for the email step.

Add secrets under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Purpose |
| --- | --- | --- |
| `BUTTONDOWN_API_KEY` | Optional | Buttondown API key. If omitted, the email step is skipped and only the website is updated. |
| `ANTHROPIC_API_KEY` | Only if using Claude | Needed only when you set `LLM_PROVIDER=anthropic`. Leave unset to use free GitHub Models. |

> Do not paste API keys into code or commit them. They belong only in Actions secrets.

GitHub Models needs the `models: read` permission, which the workflow already requests. GitHub Actions also needs permission to push the generated commit; the workflow requests `contents: write`. If pushes are blocked, enable **Settings → Actions → General → Workflow permissions → Read and write permissions**.

## Configuration (optional env vars)

Set these as repo secrets/variables or inline in the workflow `env:` block.

| Variable | Default | Notes |
| --- | --- | --- |
| `LLM_PROVIDER` | `github` | `github` (free GitHub Models) or `anthropic` (paid Claude). |
| `GITHUB_MODEL` | `openai/gpt-4o-mini` | Any model id available in GitHub Models. |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-latest` | Used only when `LLM_PROVIDER=anthropic`. |
| `BUTTONDOWN_BASE` | `https://api.buttondown.email` | API base URL. |
| `BUTTONDOWN_STATUS` | `draft` | `draft` to review before sending, or `sent` to send immediately (mapped to Buttondown's `about_to_send`). The workflow currently sets this to `sent`. |

## Editing sources

Edit [`feeds.json`](feeds.json) to add or remove feeds. Each feed must be a valid public RSS/Atom URL. Invalid or unreachable feeds are skipped automatically, so a single broken feed will not stop the run.

## Run it locally

The GitHub Models provider needs a token with `models: read` scope. In Actions this is automatic; locally, create a [fine-grained personal access token](https://github.com/settings/tokens) with the **Models** permission and export it as `GITHUB_TOKEN`.

```pwsh
cd automation
npm install
$env:GITHUB_TOKEN = "github_pat_..."   # token with Models: read
$env:BUTTONDOWN_API_KEY = "..."        # optional
node generate-digest.mjs
```

To test the paid Claude path instead:

```pwsh
$env:LLM_PROVIDER = "anthropic"
$env:ANTHROPIC_API_KEY = "sk-ant-..."
node generate-digest.mjs
```

This writes the new issue and updates the archive in your working tree (review with `git diff` before committing).

## Notes on quality and copyright

- The curation prompt instructs the model to summarize **in its own words** and link back to each original source — never to copy article text.
- The model only selects items with a concrete takeaway for IT contract recruiters; weeks with little relevant news produce a shorter issue.
- Because publishing is automatic, review the first few generated issues and tune `feeds.json` and the prompt before relying on it unattended. The workflow sets `BUTTONDOWN_STATUS=sent`, so the email goes out automatically each week — change it back to `draft` if you want a manual send step.
