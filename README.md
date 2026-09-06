# Tax.cal

**See the tax you really pay.** A fast, private, installable web app (PWA) that estimates
someone's *total* tax burden — income tax + social contributions + VAT/sales tax + fuel
duty — as one effective rate, then shows a shareable "Tax Wrapped" card.

Built for **the UK, USA (all 50 states + DC), Canada (all provinces), Australia, Ireland,
Germany, France, the Netherlands, Spain and Italy**, on **2026** tax-year rates. Everything
runs in the browser — no login, no backend, nothing stored.

The results lead with a **"you could keep up to £X a year"** estimate — the value story that
sells the subscription. It's grounded in the user's marginal rate × their country's main
tax-advantaged allowance (pension/RRSP/super/…), shown as an honest "up to" figure and clearly
labelled an estimate. Edit the caps in `assets/tax-data.js` (`SAVINGS_CAP`) or the model in
`assets/tax-engine.js` (`estimateSavings`).

> ⚠️ **Estimates only.** Direct tax uses each country's real 2026 brackets; indirect tax
> (VAT/sales tax, fuel) is a transparent estimate with confidence labels. Not tax advice.

**Live demo:** https://claude.ai/code/artifact/181ad1d5-323d-4dc2-8437-12374e016081

---

## Run it locally

It's a static site — any web server works. Because it registers a service worker, use
`http://` (not `file://`):

```bash
python -m http.server 8080
```

Then open http://localhost:8080 . (`npx serve`, VS Code Live Server, etc. all work too.)

## Deploy it

This repo is served by **GitHub Pages** at **https://taxcal.siddheshthapa.com**. No build step is
required — Pages serves the multi-file site from the repo root, so pushing to `main` deploys.

Two things make that work and should not be deleted:

1. **`CNAME`** in the repo root, containing `taxcal.siddheshthapa.com`.
2. A DNS record on `siddheshthapa.com`: `CNAME  taxcal  →  onepanda2.github.io`.

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**, and tick
*Enforce HTTPS* once the certificate is issued (can take up to an hour on first setup).

The domain appears in `index.html` (canonical + og:url + og:image + JSON-LD), `robots.txt`,
`sitemap.xml`, `build-country-pages.mjs` (`SITE`) and the share-card text in `assets/app.js`.
If it ever changes, update all five and re-run both build scripts.

### Single-file option
`npm run build` (or `node build-artifact.mjs`) produces:
- `dist/index.single.html` — the entire app in one file. Drop it anywhere.
- `dist/taxcal-artifact.html` — the body-only version used for the claude.ai Artifact.

---

## Project layout

```
index.html              # markup + SEO (meta, Open Graph, JSON-LD schema)
styles.css              # all styles (theme-aware: light/dark)
assets/
  tax-data.js           # ← RATES LIVE HERE: VAT/sales %, US states, categories, tips
  tax-engine.js         # ← BRACKETS LIVE HERE: income-tax tables + the math
  app.js                # UI wiring, the ring, the share card, comparison
manifest.webmanifest    # PWA install metadata
sw.js                   # offline service worker (bump CACHE when you change files)
robots.txt / sitemap.xml
icons/                  # app icons + og-image.png (regen with scripts if needed)
build-artifact.mjs      # inlines everything into dist/
```

## Updating for a new tax year

Almost everything is data. Each April/January when rates change:

1. **Income-tax brackets** → `assets/tax-engine.js`, the tables at the top
   (`US_FED`, `DE_IT`, `FR_IT`, `NL_B`, `IE_USC`, and the `ukIncomeTax` / `ieIncomeTax`
   functions). Each is dated and validated against published take-home figures.
2. **VAT / sales-tax %, fuel-tax share, category assumptions, US state rates, tips**
   → `assets/tax-data.js`.
3. Bump `CACHE = 'taxcal-vN'` in `sw.js` so returning users get the update.
4. `node build-artifact.mjs` to refresh the single-file / artifact builds.

**Add a country:** add an entry to `COUNTRIES` in `tax-data.js` and a `case` in
`directTaxFor()` in `tax-engine.js`. **Add/adjust a US state:** edit `US_STATES` in
`tax-data.js` (`none` / `flat` / `graduated`).

## Email capture (Formspree) — live

The "Join the early-access list" form POSTs to **Formspree**, already wired up in
`assets/app.js`:

```js
var CONFIG = { formspree: 'https://formspree.io/f/mjyveryv' };
```

Signups arrive in the Formspree dashboard and by email. Each submission also carries the
selected **`country`**, so you can see which market the interest is coming from — that's the
signal that tells you where the inbound funnel is actually working.

The free Formspree plan caps submissions per month; if the form starts filling up, that's a
good problem and the moment to upgrade or move to Buttondown/ConvertKit (just swap the `fetch`
target). If the endpoint is ever blanked out, the form degrades gracefully — it thanks the user
and stores the address in their own browser only.

---

## Distribution — the inbound/SEO plan

This app is built to be found via search, per the DissectMac playbook in this folder
(`dissectmac-international-users-playbook.pdf`). What's already done for you:

- ✅ **Schema markup** — `WebApplication` + `FAQPage` JSON-LD in `index.html`.
- ✅ **Answer-the-question content** near the top (for Google AI Overviews / ChatGPT / Perplexity).
- ✅ **Fast & light** — no framework, no third-party scripts, system-ish fonts, one CSS file.
- ✅ **sitemap.xml + robots.txt**, mobile-first, theme-aware, semantic HTML.

What to do next (a weekend's work):

1. **Set up Google Search Console + Bing Webmaster Tools** on day one; submit `sitemap.xml`.
   (Bing powers ChatGPT search.)
2. **Write one page per search query.** The stubs are already in `sitemap.xml` under
   `/country/<name>/` — e.g. *"how much tax do I really pay in the UK / Germany / USA."*
   Each should answer that one question and link into the calculator (deep-links work:
   `index.html#c=DE`, `#c=US&s=CA`, etc.).
3. **Directory listings** (one-time, permanent backlinks): Product Hunt, Hacker News (Show HN),
   Indie Hackers, BetaList, AlternativeTo, SaaSHub, Slant. Write a unique description for each.
4. **Check PageSpeed** at https://pagespeed.web.dev (aim for ~100). Optionally self-host the
   Google Font instead of linking it for the last few points.
5. Consider the free **claude-seo** Claude Code plugin from the playbook to audit the site.

---

© 2026 Tax.cal · Estimates only, not tax advice.
