# idea-generator

A small static site that hosts three self-contained web apps behind a single homepage launcher. No build step, no backend — just HTML, CSS, and vanilla JavaScript served by GitHub Pages.

**Live site:** https://maroxana.github.io/idea-generator/

## Apps

| App | Folder | Description |
|---|---|---|
| AI Insider Digest | `AIinsiderDigest/` | A weekly, curated AI digest for IT contract recruiters, with an archive and issue pages. |
| Pong | `Pong/` | A one-minute retro arcade score-attack game with a shrinking wall gap. |
| Shakespearean Insult Generator | `ShakespeareanInsultGenerator/` | Generates Elizabethan insults with copy, speech, and share tools. |

## Project structure

```
.
├── index.html                  # Homepage launcher
├── 404.html                    # Custom not-found page
├── favicon.svg                 # Shared site icon
├── .nojekyll                   # Disable Jekyll processing on GitHub Pages
├── assets/
│   ├── base.css                # Shared CSS reset (imported by every app)
│   └── styles.css              # Homepage styles
├── AIinsiderDigest/
│   ├── index.html
│   ├── archive.html
│   ├── assets/styles.css
│   └── issues/*.html
├── Pong/
│   ├── index.html
│   └── assets/{styles.css, app.js}
└── ShakespeareanInsultGenerator/
    ├── index.html
    └── assets/{styles.css, app.js}
```

## Conventions

- Each app lives in its own folder with an `assets/` subfolder for `styles.css` and (where applicable) `app.js`.
- Every stylesheet imports the shared reset via `@import "../../assets/base.css";`. Each app keeps its own color palette and layout.
- Internal links point to directories (e.g. `Pong/`) rather than `Pong/index.html`, so URLs stay clean.

## Run locally

Any static file server works. For example, with Python:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

## Deploy

The site is served by GitHub Pages from the `main` branch root (`/`). Pushing to `main` publishes the changes.

1. Commit and push to `main`.
2. In the repository **Settings → Pages**, confirm the source is **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait for the "pages build and deployment" action to finish, then visit the live site.
