# Credit Calendar website

Astro + native Three.js + CSS, statically deployed to GitHub Pages.
No React, Tailwind, GSAP, Ruby, or Jekyll build is required.

## Install and preview

Use Node 24 LTS (`nvm use` if you use nvm), then:

```sh
npm install
npm run dev
```

Open the local URL printed by Astro (normally http://localhost:4321).
The dev server reloads changes automatically.
Commit the generated `package-lock.json`. Subsequent clean installs should use
`npm ci`. The migration environment could not reach npm's registry, so no lockfile
has been generated or dependency-backed build verified yet.

## Build and check

```sh
npm test
npm run verify
npm run test:content
npm run preview
```

- `test`: dependency-free content filtering, search, and URL tests.
- `verify`: Astro/TypeScript checks, production build, then Python 3 checks for
  local links, expected routes, RSS entries, and exact `app-ads.txt` copying.
- `test:content`: temporarily creates published/draft/future fixtures, builds to
  a temporary directory, and verifies Markdown, taxonomy, RSS and full-text search.
  Fixtures are removed even if the build fails; production `dist/` is unchanged.
- `preview`: serves the production `dist/` output locally.

Do not edit generated `dist/` or `.astro/` files.

## Structure

- `src/pages/`: product pages and generated article/taxonomy routes.
- `src/layouts/Layout.astro`: shared metadata, navigation, footer, and stylesheet.
- `src/styles/site.css`: existing responsive CSS with the app palette and system
  light/dark mode. Cyan `#32ADE6` is a web approximation of SwiftUI `Color.cyan`;
  the other app palette values are retained exactly as CSS custom properties.
- `src/components/HeroScene.astro`: lazy-loads Three.js only on the homepage.
- `src/scripts/hero-scene.ts`: decorative card scene, capped pixel ratio,
  offscreen/background pausing, and GPU cleanup. Reduced motion skips loading
  the scene. The HTML/CSS phone remains visible if scripts or WebGL fail.
- `src/content/posts/`: Markdown updates (initially empty).
- `src/content.config.ts`: validated article metadata.
- `public/`: files copied unchanged, including `app-ads.txt`, app icon and favicons.

The homepage phone preview is rendered with HTML, CSS, and inline SVG in `AppPreview.astro`, based on the app feed. It stays light in both system appearances; feature descriptions do not use screenshots.
The colors reference https://whatsub.equal2.app/ and the Credit Calendar app;
no reference-site artwork or source code is reused.

## Write an article

Create `src/content/posts/my-first-update.md`:

```md
---
title: "My first update"
description: "A short summary of the update."
date: 2026-11-22
tags: ["App updates"]
categories: ["News"]
draft: true
---

## What’s new

Write your article in Markdown.
```

Set `draft: false` when ready. The filename becomes `/posts/my-first-update/`.
Optional `slug` overrides the generated ID. Optional `updated` adds a visible
updated date. Dates are displayed in UTC to avoid day shifts for date-only input.
Drafts and future-dated posts are excluded from every public route and RSS.
Scheduled posts appear after a new build runs on or after their publication date;
GitHub Pages does not rebuild automatically merely because time has passed.
Use topic names without slash or backslash characters.

Published articles automatically populate `/feed/`, `/archives/`, `/tags/`,
`/categories/`, and `/feed.xml` (RSS 2.0, retaining the original feed URL).
`/search/` filters titles, summaries, tags, categories, and Markdown body locally.
It supports Chinese and case-insensitive multi-word queries; no search service or
account is needed. Without JavaScript, the full article list is still available.
This searches website updates, not the external Doctor of Credit website.

## Deployment

Repository Settings → Pages → Source: **GitHub Actions**.
The workflow builds and verifies pull requests, and deploys pushes to `main` or
`master`. It uploads `dist/`; only the deployment job has Pages write permissions.
Before a lockfile exists, CI uses `npm install`; afterward it uses `npm ci`.

`site` is `https://creditcalendar.github.io`; this root-domain repository needs no
`base` prefix. Existing page URLs and `/app-ads.txt` are preserved.

The old Jekyll settings and theme submodule remain in Git as historical references;
Astro does not load or publish them. Previous standalone HTML and Python build/
preview entry points have been removed so there is one active site source.
