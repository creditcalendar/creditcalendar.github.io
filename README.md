# Credit Calendar website

A responsive, standalone product website for Credit Calendar. Plain HTML and CSS,
with Python's standard library for building and local preview. No Chirpy, Jekyll,
Ruby, Node, or third-party packages are needed.

## Local preview

From the repository root, with Python 3 installed:

```sh
python3 tools/serve.py
```

Open http://127.0.0.1:4000. Stop with Ctrl+C. After editing source files, restart
the command and refresh the browser. This preview does not provide live reload.

## Build and verify

```sh
python3 tools/build.py
python3 tools/check.py
```

`_site/` is generated output; do not edit it. The build copies only explicitly
listed public paths, so development files are not published.

## Content

- `index.html`: product overview. The phone is a clearly labeled HTML/CSS
  illustration, not an actual screenshot. Replace it with current app screenshots
  when finalizing the marketing artwork.
- `assets/css/site.css`: shared responsive styling.
- `contact/index.html`: support email and support guidance.
- `developer/index.html`: developer information and existing social links.
- `feed/index.html`: product updates landing page (currently empty).
- `feed.xml`: valid, currently empty Atom feed at the original RSS URL.
- `about/`, `archives/`, `categories/`, `tags/`: retained legacy routes.
- `app-ads.txt`: advertising declarations, copied verbatim to the site root.

Header and footer HTML are shared by convention across pages. When changing
navigation, update all pages and run the checker. To publish future updates,
add the update content to the Feed page and corresponding entries in `feed.xml`;
there is no CMS or automatic Markdown feed generator.

The old Jekyll configuration, Gemfile, `_tabs`, `_data`, and `_plugins` are retained
as migration reference only and excluded from the build. Existing bundled theme
assets under `assets/lib` are also excluded.

## Deployment

GitHub Actions builds, checks, and deploys `_site/` on pushes to `main` or `master`.
GitHub repository Settings → Pages → Source should be **GitHub Actions**.
The site is intended for the root domain https://creditcalendar.github.io.

After deploying, verify https://creditcalendar.github.io/app-ads.txt returns the
expected plain text. Updating this file does not require changes to the homepage.
