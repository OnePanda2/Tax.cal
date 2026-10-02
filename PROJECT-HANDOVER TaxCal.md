# Tax.cal — Full Project Report & Handover

**Written 11 September 2026. Last updated 2 October 2026** (§17d). Everything known about this
project as of that date. Assume the conversation that produced it no longer exists — this file
is the record. **Update it at the end of every working session.**

> **Location changed 2 October 2026.** Siddhesh uploaded this file to the repository root
> (`PROJECT-HANDOVER TaxCal.md`, commit `eeb23ad`), and it is now the copy that gets updated.
> It was previously kept outside the repo at `F:\Projects\Handovers\` because the repo is
> **public** and this document contains business strategy, pricing reasoning, unresolved legal
> exposure and security notes. **Everything in it is now publicly readable**, including through
> git history even if the file is later deleted. That trade-off is Siddhesh's call; do not put
> secrets, credentials or anything you would not publish in here.

---

## 0. The 60-second version

Tax.cal is a website that shows someone their **real** total tax burden — not just
income tax, but social contributions plus the VAT/sales tax and fuel duty buried in
their spending — as a single percentage. It covers **11 countries** (India added
2 October 2026). It is free, runs entirely in the browser, and is built to be found
through search.

**Since 2 October 2026 there is a second surface: a ChatGPT plugin** (MCP server on
Cloudflare Workers + an Agent Plugins package) that runs the *same* tax engine. It is
**built and tested but not yet deployed or submitted** — see §17d and §16.

On top of that sits **Tax.cal Plus**: a questionnaire that asks about the user's
actual situation and returns a ranked list of legal ways they might pay less tax.
Plus is currently **free and ungated**.

**⚠️ DIRECTION CHANGED 12 September 2026 — read §7 before building anything.**
Siddhesh has rejected the concierge model. There is to be **no human behind the
paywall**; the site must solve the user's problem automatically. The reason is
decisive: **nobody on the team has a finance or tax qualification.** The concierge
card is still live on the results page and needs a decision (see §7).

Current plan: wait ~2 days, watch which country produces the most early-access
signups, then build for that country first.

**Everything is live.** Nothing is half-built. The bottleneck is not code — it is
that nobody has visited yet.

---

## 1. Live URLs

| What | URL | Status |
| --- | --- | --- |
| Main site | https://taxcal.siddheshthapa.com | live |
| Plus questionnaire | https://taxcal.siddheshthapa.com/plus/ | live, free, `noindex` |
| Privacy policy | https://taxcal.siddheshthapa.com/privacy/ | live |
| Terms / Support | `/terms/`, `/support/` | live (added 2 Oct 2026) |
| Country pages | `/country/{uk,usa,canada,australia,ireland,germany,france,netherlands,spain,italy,india}/` | live, indexed |
| Sitemap | https://taxcal.siddheshthapa.com/sitemap.xml | live, 17 URLs |
| API (Cloudflare Worker) | https://taxcal-plus-api.onepanda2.workers.dev | live |
| MCP server (ChatGPT plugin backend) | https://taxcal-mcp.onepanda2.workers.dev/mcp | **not deployed yet** |
| Repository | https://github.com/OnePanda2/Tax.cal | **public** |
| Demo artifact (claude.ai) | https://claude.ai/code/artifact/181ad1d5-323d-4dc2-8437-12374e016081 | live |
| Questionnaire spec (claude.ai) | https://claude.ai/code/artifact/fe5f3504-b2b5-406d-b4bb-d1c73e637df0 | live |

**`www.siddheshthapa.com` is Siddhesh's personal site** ("cognitive constellation"),
also on GitHub Pages. Tax.cal lives on the `taxcal.` **subdomain** specifically so
the personal site is never overwritten. **Do not deploy Tax.cal to the apex or www.**

---

## 2. Infrastructure and accounts

- **GitHub** — user `OnePanda2`. Hosts the repo and serves the site via **GitHub Pages**
  from `main` / root. Pages is enabled and the custom domain works via the `CNAME`
  file in the repo root (contains `taxcal.siddheshthapa.com`). **Do not delete `CNAME`
  or `.nojekyll`.**
- **DNS** — a `CNAME` record `taxcal` → `onepanda2.github.io` at the domain registrar.
- **Cloudflare** — account id `8fc82e42c07a0a306fe0660f06359e37`. Runs the Worker
  `taxcal-plus-api` and the D1 database `taxcal-plus`
  (id `a85a81c3-b404-46c3-aacd-562b4842752a`, created with `--location weur`, i.e.
  Western Europe, because that is where the customers are).
- **Cloudflare, second Worker (2 Oct 2026, not yet deployed)** — `taxcal-mcp` (and
  `taxcal-mcp-staging`), config `mcp/wrangler.toml`. Stateless, **no database**. Uses the
  Workers Rate Limiting binding. One secret, `OPENAI_APPS_CHALLENGE` (OpenAI domain
  verification token), set with `wrangler secret put` — never in `[vars]` (see §15 bug 3).
- **OpenAI Platform** — needed for the plugin submission: a **verified organization** and the
  `api.apps.write` permission. Not set up yet.
- **Formspree** — form endpoint `https://formspree.io/f/mjyveryv`, receives waitlist
  signups plus the selected country.
- **Plausible** — privacy-friendly analytics, added 12 September 2026. Site registered
  as `taxcal.siddheshthapa.com`. The snippet lives in the `<head>` of `index.html`,
  `plus/index.html`, `privacy/index.html` **and in `build-country-pages.mjs`** — that
  last one matters: the ten country pages are generated, so a snippet placed only in
  the output files is silently wiped by the next `node build-country-pages.mjs`. Those
  pages are the entire inbound strategy, so losing them from analytics would defeat the
  point. Script id: `pa-Wj_1OavoJ4_-NVQlAh9IK.js`.
- **Google Search Console** — verified via the file
  `google134dbfbb9b050613.html` in the repo root. **Deleting that file un-verifies
  the property.** Sitemap submitted.
- **IndexNow** — added 13 September 2026. Key `0193e04e758f4618bb99dbfc15f38dd9`,
  served from the key file `0193e04e758f4618bb99dbfc15f38dd9.txt` at the repo root
  (uploaded by Siddhesh through GitHub's web UI). **Deleting or renaming that file
  breaks IndexNow.** It is not a secret: IndexNow requires it to be public. Submissions
  are automated by a GitHub Actions workflow — see §13.
- **Bing Webmaster Tools** — account setup **not confirmed**. Bing already receives every
  sitemap URL through IndexNow (Bing is an IndexNow participant), including
  `/tax-by-country/`, so a manual URL submission there would be a duplicate. Still worth
  adding the site via *Import from Google Search Console*, because its **IndexNow**
  report is the only way to confirm Bing is actually receiving the submissions. Bing
  powers ChatGPT search, which matters for the AI-search strategy.

### Secrets

The only secret is `RATE_SALT`, a Cloudflare Worker secret (type `secret_text`). It
is used solely to hash IP addresses for rate limiting so raw addresses are never
stored. **Nothing depends on remembering its value** — if lost, just set a new one:

```
npx wrangler secret put RATE_SALT
```

Any long random string works. The worker has a built-in fallback, so a missing
secret degrades rather than breaks.

**There are no other secrets anywhere.** No API keys are embedded in client code.

---

## 3. Contact details on record

- Privacy-page contact: **siddheshthapa02@gmail.com** (with the "h")
- Git commit author: **siddeshthapa02@gmail.com** (no "h") — verified as linked to
  the GitHub account, contributions count correctly
- Concierge offer emails go to: **siddheshthapa02@gmail.com**

⚠️ **These two addresses differ by one letter and this was never resolved.** If the
privacy-page address is a typo, GDPR requests and paying customers both land nowhere.
**Verify this.**

---

## 4. Repository map — every tracked file

> **Superseded 2 October 2026.** `assets/tax-data.js` and `assets/tax-engine.js` no longer
> exist. All tax rules and arithmetic now live in **`packages/tax-core/`** (`rules/<cc>.js` data
> with sources and versions, `calc/<cc>.js` maths, `engine.js`, `api.js`, `validate.js`), bundled
> by esbuild into `assets/tax-core.js` for the browser. New top-level pieces: `mcp/` (MCP server),
> `taxcal-plugin/` (ChatGPT plugin package), `docs/` (sources, India model, architecture, update
> procedure, OpenAI submission checklist, release notes), `tests/` (120 tests, CI in
> `.github/workflows/ci.yml`), `scripts/`, `terms/`, `support/`, `CLAUDE.md`. `package.json` now
> has dev dependencies (esbuild, ajv, MCP SDK clients) — still **no runtime dependencies** in the
> site. Service-worker cache is **v19**. The map below is the September layout, kept for history.

```
.gitignore              excludes: the DissectMac PDF (third-party copyright),
                        two private strategy docs, Cloudflare local state,
                        and this handover file
.nojekyll               stops GitHub Pages running files through Jekyll
.github/workflows/indexnow.yml   submits sitemap URLs to IndexNow on every push (§13)
0193e04e758f4618bb99dbfc15f38dd9.txt   IndexNow key file — do not delete or rename
CNAME                   contains taxcal.siddheshthapa.com — required for the domain
README.md               developer-facing: how to run, deploy, update rates
package.json            scripts only; NO runtime dependencies
index.html              the calculator + all SEO metadata (JSON-LD, OG, Twitter)
styles.css              every style, theme-aware (light/dark, 3 states)
sw.js                   service worker, offline PWA. CACHE is currently 'taxcal-v8'
manifest.webmanifest    PWA install metadata
robots.txt              allows everything, points at the sitemap
sitemap.xml             11 URLs
google134dbfbb9b050613.html   Search Console verification — do not delete

assets/
  tax-data.js           RATES LIVE HERE. Countries, VAT/sales %, US states,
                        CA provinces, spending categories, tips, SAVINGS_CAP
  tax-engine.js         MATH LIVES HERE. Income-tax bracket tables + all
                        calculation functions. Pure functions, no DOM.
  app.js                calculator UI wiring, the ring, share card, comparison
  plus-questions.js     the Plus questionnaire: 10 bespoke country question sets
  plus-engine.js        the Plus rules engine: 88 rules
  plus-app.js           the Plus questionnaire UI + concierge offer
  plus-api.js           API client; degrades gracefully when the backend is off

plus/index.html         the Plus questionnaire page (noindex)
privacy/index.html      the privacy policy
country/<slug>/         10 generated SEO landing pages
dist/                   built single-file outputs (see build scripts)
icons/                  app icons + og-image.png

api/
  src/index.js          the Cloudflare Worker (the entire backend)
  schema.sql            D1 schema
  wrangler.toml         Worker config
  README.md             deploy instructions + the RATE_SALT gotcha

hidden-tax/             blog post #1 — the methodology page (generated)
tax-by-country/         blog post #2 — ten-country comparison (generated)

build-guide-pages.mjs   generates hidden-tax/ from the live engine
build-compare-page.mjs  generates tax-by-country/ from the live engine
build-artifact.mjs      inlines CSS/JS → dist/index.single.html and
                        dist/taxcal-artifact.html
build-country-pages.mjs generates the 10 country pages using the LIVE engine,
                        so marketing numbers can never drift from the calculator
```

### Local files deliberately NOT in git

- `dissectmac-international-users-playbook.pdf` — third-party copyrighted material;
  the distribution strategy came from it
- `taxmirror-office-hours-design-doc.md` — original design doc
- `taxmirror_handover_prompt.md` — original handover
- `PROJECT-HANDOVER.md` — this file

---

## 5. How the free calculator works

**Input:** country, gross annual salary, region (US state / Canadian province),
filing status (US only), and monthly spend across 6 categories (groceries, dining,
fuel, shopping, utilities, entertainment).

**Output:** one effective tax rate, the visible/hidden split, tax by type, a
cross-country comparison, a "tax freedom day", 3 country-specific tips, a shareable
"Tax Wrapped" canvas card, and the savings hero.

### Two very different kinds of number

1. **Direct tax — precise.** Income tax, social contributions and state/provincial
   tax computed from each country's **real published 2026 marginal brackets**.
   Validated in Node against known real-world take-home figures for every country.
   This is the credible part.
2. **Indirect tax — a disclosed estimate.** VAT/sales tax and fuel duty computed
   from category-level effective-rate assumptions, each carrying a confidence label
   (high/med/low) shown in the UI. Explicitly labelled as approximation.

### The bracket tables (historical — now in `packages/tax-core/src/rules/`)

```
US_FED, DE_IT, FR_IT, NL_B, IE_USC, CA_FED (+ CA_BPA 16452),
AU_IT, ES_IT, IT_IT
```
plus hand-written functions: `ukIncomeTax`, `ukNI`, `usFica`, `usStateTax`,
`deSocial`, `frSocial`, `nlTax`, `ieSocial`, `caProvTax`, `caSocial`,
`auSocial`, `esSocial`, `itSocial`.

Core helper is `brackets(x, b, floor)`. Entry point is `compute(input)`.

### The hero proof line (added 12 September 2026)

The first screen previously showed an input form and told the visitor *"Example
numbers — change the salary and spending above to see your own"*, which asked them to
construct the demonstration before seeing the product work. Siddhesh called this
*"backwards for acquisition."*

The hero now carries the worked example itself: the real effective rate, the payslip
rate beside it, and how many points are hidden in spending (UK £45k → **24% real vs
20% payslip, +3.8 pts hidden**). It is populated in `render()` from the same computed
result `r` as the rest of the page, so **it can never contradict the calculator below
it**, and it follows the country and salary. Elements: `#proofRate`, `#proofLine`,
`#proofSeen`, `#proofHidden`. The notice below the results now asserts rather than
apologises.

### The persistent early-access button (added 12 September 2026)

`#stickyCta`, fixed bottom-right, always on screen. Scrolls to `#notify` and focuses
the email field. **Hides itself via IntersectionObserver while that form is actually
visible**, so it never covers the thing it points at, and returns on scroll away.
Full-width below 560px; transforms disabled under `prefers-reduced-motion`.

### The savings hero ("you could keep up to £X a year")

This is the headline number and it exists because **Siddhesh's explicit product
steer: users care ~60% about what they could save and ~40% about what they pay.**
He directed that the **higher end** of any range be shown, clearly labelled approximate.

It is computed by `estimateSavings()`: measure the marginal rate numerically (tax
delta over a £1,000 income bump), multiply by a capped fraction of salary, where the
cap is the country's real tax-advantaged contribution limit from `SAVINGS_CAP`:

```
UK 60000 · US 23500 · CA 32000 · AU 30000 · IE 25000
DE 28000 · FR 35000 · NL 15000 · ES 1500  · IT 5164
```

**It is deliberately framed as a typical-case model, NOT a personal finding**, because
the app has not seen the user's circumstances. The copy says so, and there is a
dedicated FAQ (visible + in the FAQPage JSON-LD) explaining exactly how it is derived
and that "some or none of it may apply to you". Do not reword this into a promise.

---

## 6. How Tax.cal Plus works

### 6.1 The questionnaire (`assets/plus-questions.js`)

**10 bespoke question sets — one per country. Not one universal set.** This was an
explicit decision by Siddhesh, overruling a proposal for universal questions with
country-specific branching:

> "Same questionnaire for all countries/states is a really really bad Idea. We need
> to [treat] the users of each country like the app is specifically made for them
> since the very start."

Each country has **5 base questions** in its own vocabulary — Germany asks your
*Steuerklasse*, the Netherlands about the *30% ruling*, Australia about carried-forward
*concessional cap*, Italy about the *fondo pensione*, France about *PER* and
*quotient familial*.

Totals: **50 base questions, 278 base options, 30 follow-up questions, 112 follow-up options.**

**Adaptive:** follow-ups unlock only when an answer signals more depth is needed. A
straightforward UK employee answers 5 and stops; a sole trader with rental income and
an uneven-income marriage sees the count grow 5 → 6 → 7 → 8. Deselecting the trigger
removes the follow-up **and its stored answer**, so stale answers cannot leak in.

**Every question has:**
- an **"Something else — let me explain"** option with a free-text box. Selecting it
  blocks Continue until text is entered, so it cannot be used to skip a question.
  Whatever is typed is surfaced on the results page as flagged for a human.
- most have **"I am not sure"**, which records the answer as genuinely unknown and
  excludes it from the estimate rather than guessing.

The engine reasons over **tags**, never display text, so wording can be changed freely
without breaking any rule.

### 6.2 The rules engine (`assets/plus-engine.js`)

**88 rules = 80 conditional + 8 baseline.**

| Country | Rules | | Country | Rules |
| --- | --- | --- | --- | --- |
| UK | 12 | | DE | 7 |
| US | 11 | | FR | 7 |
| CA | 8 | | NL | 7 |
| AU | 7 | | ES | 7 |
| IE | 7 | | IT | 7 |

Each rule is: **when it applies** (a function over the user's tags), **why it matters**,
**what to do**, **its basis** (the stated assumption), **a caveat**, a **confidence**
label, and **an estimated value** (marginal rate × a stated amount).

**Three constraints are enforced throughout, and must not be relaxed:**

1. A finding describes something to **CHECK**, never something asserted about the
   user — we have not seen their return or payslip.
2. Every figure is an **estimate** from the marginal rate against a stated assumption.
   Where it cannot be estimated responsibly, `value` is `null` and **no number is
   shown** rather than an invented one.
3. Anything uncertain is **flagged for human review** rather than dressed up as advice.

**Baseline rules** run for everyone, one per country (e.g. UK "check your PAYE tax
code"). They exist because a well-organised person can legitimately trigger no rules
at all, and **a paid product must never return an empty page.**

**The "thin" verdict.** When findings are still thin, `evaluate()` returns
`verdict: 'thin'` and `shouldOfferRefund: true`, and the page says plainly *"we did
not find much… ask us for a refund and you will get one"*. The concierge card also
switches to *"You probably do not need me"*. This is deliberate: manufacturing
findings to justify a fee is the one thing that would destroy trust, and it is also
the strongest protection against complaints.

Validated against **13 personas across all 10 countries**. Test script (not in repo,
recreate if needed) loaded the engine in Node and asserted every finding carries a
basis and caveat, no non-positive values, and that nobody gets zero findings.

### 6.3 The Plus UI (`plus/index.html` + `assets/plus-app.js`)

Three steps: intro (showing what carried over) → one question per screen with a
progress bar → ranked results. Keyboard shortcuts: **1–9** picks an option, **Enter**
advances.

**State carries over from the calculator.** `assets/app.js` writes the current input
to `sessionStorage` under `taxcal_carry` on every recompute; Plus reads it and shows
it back as "what we already have". URL params also work (`?c=UK&g=110000&s=CA`).
**`sessionStorage` deliberately, not `localStorage`** — it dies with the tab, which
keeps the calculator's promise that the visitor's figures never leave their device
(the claim was worded "nothing stored" until the analytics change; see §8 principle 5).

### 6.4 The backend (`api/`)

A **Cloudflare Worker + D1**. Its only job is to let a completed review survive a
refresh or a new device.

**Deliberately no accounts, no passwords, no email.** A review is reached by an
unguessable link: a 64-bit public id plus a 192-bit secret, and only a **SHA-256 hash**
of the secret is stored.

Why this design:
- A breach exposes **anonymous answers, not people** — there is no identity in the table.
- Deletion is self-service, satisfying the right to erasure with no support process.
- No password handling anywhere in the product.
- The token rides in the **URL fragment**, so it is never in a request line, never in
  a server access log, and not passed on in a `Referer` header.

The stated cost, on the privacy page: **lose the link and it cannot be recovered**,
because nothing identifies which record was yours. It expires by itself after a year.

**Endpoints:**

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/review` | save; returns `{id, token, expiresAt}` |
| GET | `/review/:id?t=token` | fetch |
| DELETE | `/review/:id?t=token` | delete permanently |
| GET | `/health` | liveness |

**Hardening already in place:**
- Wrong id, wrong token and expired review all return **the same 404 with the same
  message** — the endpoint cannot be used to discover which ids exist
- Constant-time token comparison
- Input validated against a country allowlist and sane numeric ranges
- Free text capped at 2,000 chars per field; stored row bounded ~70 KB
- `MAX_BODY` 64 KB; `RATE_LIMIT` 20 writes per IP per hour; `RETENTION_DAYS` 365
- Rate limiter stores a **salted hash** of the IP, never the address
- Retention swept on every request (`ctx.waitUntil`), not left to a cron job
- CORS allowlist; unknown origins are not echoed back
- All SQL parameterised — 8 `bind()` calls, zero string interpolation
- Errors never leak internals to the client

**Verified in production:** create → read → wrong-token 404 → delete → gone 404, plus
a CORS preflight returning 204 with the correct `Access-Control-Allow-Origin`.

The client (`assets/plus-api.js`) **degrades rather than breaks**. Blank `BASE` and
the results page says saving is not switched on and offers the PDF. Saving is an
enhancement, never a dependency.

---

## 7. The business model

### Target market

**UK, USA, Canada, Australia, Ireland, Germany, France, Netherlands, Spain, Italy.**

**India was deliberately removed** partway through the project. Siddhesh's instruction:
*"Remove India from the target market list completely."*

**Reversed 2 October 2026 on Siddhesh's instruction:** India is back as country #11 in the
calculator and the ChatGPT plugin, treated as a possible acquisition market (Tax Year 2026-27,
Income-tax Act 2025, new vs old regime). Plus has **no India question set** yet. No
"India gets it free" logic — every supported user gets the same core calculation.

Canada, Australia, Spain and Italy were added on his explicit instruction:
*"Anything that catches the attention of our first customer online and makes them pay,
is crucial to us at this stage."*

### The intended funnel

1. Free calculator attracts search traffic
2. Results lead with "you could keep up to £X"
3. That drives either the waitlist or the Plus questionnaire
4. The Plus results page offers the concierge review
5. Customer emails → Siddhesh replies with a payment link → delivers by hand

### ⚠️ The concierge offer — BUILT, LIVE, AND REJECTED

**Siddhesh's decision, 12 September 2026:** *"No we don't want that. We need to build
the website in such a way that it solves all of their problems automatically. No human
behind the paywall."*

The reason matters more than the decision: **there is nobody on the team with finance
or tax knowledge.** A human-delivered review was never deliverable.

**REMOVED 12 September 2026** (commit `0a03753`). The card, the `CONCIERGE` price
table, `renderConcierge()` and its styles are all gone. **No price appears anywhere on
the site.** There is now no revenue path at all, which is the correct honest state
until the automated product exists.

In its place the results page carries `#nextCard`, pointing at the early-access list
on the homepage (`../index.html#notify`) and stating plainly that the visitor just
used the free preview and the full version is still being built.

> ### ⚠️ THE UNRESOLVED RISK IN FULL AUTOMATION
>
> **The 88 rules were written by an AI, from general knowledge — not by a qualified
> tax professional, and nobody on the team can verify them.**
>
> That was tolerable while a human sat between the rules and the customer. With full
> automation behind a paywall that human disappears: a wrong rule reaches a paying
> customer undetected, and nobody will notice when rates change next April.
>
> Two mitigations, both cheap:
> 1. **The "things to check" framing is load-bearing, not stylistic.** The engine says
>    *check this*, never *do this*, and never asserts a fact about the user. Do not let
>    anyone "improve" this into confident instructions.
> 2. **Before charging for automated output, pay one qualified professional in the
>    chosen country to review that country's rules.** A one-off review of ~12 UK rules,
>    not a hire. It is the only way to close the gap.

### The concierge mechanics, for historical reference only (REMOVED from the site)

Prices, all in `CONCIERGE` at the top of `assets/plus-app.js`:

```
UK £29 · US $39 · CA CA$49 · AU AU$59 · IE/DE/FR/NL/ES/IT €34
```

The button opens a **pre-filled `mailto:`** containing the user's country, salary,
marginal rate, top three findings and their saved review link if they have one. They
see the draft in their own mail client and press send themselves — nothing transmits
from the page.

**Why manual and not a payment gateway:** it proves someone will pay before building
billing, it teaches what advice actually helps before hardening it into rules, and it
avoids VAT/merchant-of-record complexity entirely at this stage.

**Fine print on the card states plainly:** not a regulated tax adviser; this is help
understanding which general reliefs fit a situation, not personal financial advice;
does not replace an accountant. **Keep actual replies on that side of the line** —
"here's which of these apply to you and why", never "put £X into product Y".

### Payments — decided, not built

- **Do not use Razorpay** for this. Collecting recurring international payments into
  India means international-card approval, RBI e-mandate constraints, and export-of-
  services compliance (LUT, FIRC/BRC).
- **The bigger issue is VAT.** Selling *automated digital services* to UK/EU consumers
  creates a VAT obligation **in the customer's country, from the first sale, with no
  threshold** for a non-EU seller.
- **Recommendation: a Merchant of Record — Paddle (preferred for subscriptions) or
  Lemon Squeezy.** They become the legal seller and handle VAT and US sales tax
  everywhere. ~5% + $0.50 vs Stripe's ~3%; that extra ~2% buys exemption from
  multi-country tax registration, which for a one-person company is worth far more.
- MoRs **manually review your live site and reject "coming soon" pages**, so apply
  only once there is real traffic and a working product.
- A **manually delivered human service** is treated differently from an automated
  digital supply for VAT purposes — another reason the concierge route is the right
  first step. **Confirm with an accountant before taking money.**

---

## 8. Copy and messaging principles — do not break these

These were fought for deliberately. Every one protects against a real complaint.

1. **The savings number is a typical-case model, not a personal finding.** Wording:
   *"what someone earning what you earn could keep by making full use of the legal
   tax-advantaged allowances in X"*. Pill says "Upper estimate". CTA says "See what
   applies to me".
2. **Findings say what to CHECK**, never what is true of the user.
3. **Show no number rather than an invented one.**
4. **Tax.cal Plus is described as "in development", with "no payment being taken"**
   on the main page, because it is not a finished paid product.
5. **Say only what is exactly true about storage, and change every place at once.**
   This rule has now been exercised twice. First when Plus saving arrived, the FAQ *and*
   its JSON-LD were both corrected. Then on 12 September 2026, adding Plausible made the
   privacy page's "we run no third-party analytics" false, and made two absolute claims
   imprecise because page views *are* now stored:
   - hero: "Free, private, **nothing stored**" → "Free, and **your figures never leave
     your device**"
   - JSON-LD featureList: "no data stored" → "your figures stay on your device"

   The replacements name what is actually protected, which is both accurate and a
   stronger claim than a blanket denial a sceptic can poke a hole in. **If the data
   behaviour ever changes again, grep the whole site for storage claims and fix them in
   the same commit.**
6. **"I am not sure" is a real answer** — never force a guess into a paid recommendation.

---

## 9. Distribution strategy

Inbound/SEO only, per the DissectMac playbook. **Siddhesh does not live in any target
country**, which is *why* outbound was rejected.

Already done: schema markup (`WebApplication` + `FAQPage` JSON-LD), answer-the-question
content near the top, no framework/no third-party scripts, `sitemap.xml` + `robots.txt`,
one landing page per search query in `country/<slug>/`, deep links into the calculator
(`index.html#c=DE`, `#c=US&s=CA`).

Still to do: Bing Webmaster Tools; directory listings for permanent backlinks —
Product Hunt, Show HN, Indie Hackers, BetaList, AlternativeTo, SaaSHub, Slant;
PageSpeed check.

**Reddit is largely closed to us — verified 12 September 2026** by reading the actual
rules pages. This matters because the growth report treats communities as the
highest-ROI channel; for this product they mostly are not.

| Subreddit | Verdict | The actual rule |
| --- | --- | --- |
| r/UKPersonalFinance | **Banned** | *"Do not post to promote your website, tool, app, online calculator, blog, newsletter etc."* It names online calculators specifically. Surveys and AMAs need prior mod approval. |
| r/personalfinance | **Banned** | *"Promotion of web content, products, services, companies, or anything else owned by you… even if not monetized."* The "even if not monetized" clause closes the "but it's free" argument. Also bans prominently stating financial credentials. |
| r/EUpersonalfinance | **Banned** | Principle: *"Avoid self-promotion."* Rule: *"Promotion of a product or service in comments is strictly prohibited"* — so not even a helpful comment with a link. AMAs need pre-approval. |
| r/FIREUK | **Possible** | No explicit self-promotion ban in its rules. But rule 1 redirects general personal-finance topics to r/UKPersonalFinance, so a tax calculator may be pushed out as off-topic unless framed around FI/RE. **Message the mods first.** |
| r/SideProject | **Probably fine** | No rules section found. It exists to showcase things people built. |

**Consequence:** the three subreddits with the right audience all prohibit this, and the
two that might allow it are small or off-target. Do not spend more effort trying to find
a way in — posting anyway risks the account and the domain. Redirect that effort to
directory listings, SEO content, and a single Show HN.

**Feedback plan.** Siddhesh has two friends studying in the **UK** and **Canada** (not
natives). They are **recruiters, not testers** — their job is to find 5 salaried locals
each. The brief, which works and should be reused:

1. Before showing anything, ask what % of income they *think* goes to tax. Write it down.
2. Send the link, say only "have a go, think out loud", then stay silent.
3. Ask what it said versus what they guessed.
4. Ask "what's the first thing you'd do now?" — then say nothing.
5. Ask if they have ever *actually paid* for tax help, what and how much.
6. **Never ask "would you pay for this?"** — people say yes to be nice.

What to measure: the **gap** between their guess and the real number is the whole
product. **Q4 is the conversion test.** **Q5 is the only honest signal about money.**
The silent metric is whether anyone signs up without being asked.

**Measurement, since 12 September 2026.** Plausible is live on every page, so traffic by
country is now visible — which is precisely the signal for deciding which country to
build the automated product for first. Before this there was no instrumentation at all
beyond Formspree signups. Watch **page views by country** and **signups**, in that
order.

**Expectation setting:** a brand-new domain with no backlinks takes days to index and
weeks to rank. Search Console will show zeros at first. Watch **Pages → Indexed**
before watching clicks.

---

## 10. Security posture

**Audited 9 September 2026. Findings: clean.**

| Check | Result |
| --- | --- |
| SQL injection | Clean — 8 parameterised `bind()` calls, no interpolation |
| XSS via crafted review link | Closed — findings are **recomputed locally** on restore, never read from the server; free text goes through `esc()` |
| Committed credentials | None |
| Third-party JavaScript | **One** — the Plausible analytics script, added 12 Sep 2026. Still no npm packages and nothing else from a CDN. |
| Known-CVE dependencies | None — no runtime dependencies exist |
| Payment attack surface | **Zero** — no gateway, no card fields |

**Analytics added one supply-chain surface, on purpose.** That table row read "None"
until 12 September 2026, and the security argument rested on it. There are still no npm
packages, no bundler and no API keys in client code — but **Plausible is one third-party
script**, so if `plausible.io` were ever compromised, arbitrary JavaScript would run on
every Tax.cal page, including the Plus questionnaire where people answer questions about
their finances. Unlikely, but real, and it is the price of having analytics at all. The
trade was accepted deliberately: flying blind on traffic was worse. **Do not let that
count grow past one without a reason — each additional third-party script multiplies
this surface.**

**The biggest realistic risk is still account compromise, not code.** Anyone with the
GitHub account can push a script that reads every visitor's salary. **Two-factor
authentication on GitHub and Cloudflare is the single highest-value security action.**
Confirm it is on.

### The paid-content problem — decided 9 September 2026

`assets/plus-engine.js` (88 rules) and `plus-questions.js` are **served to every
browser and are freely downloadable**. Siddhesh asked whether hackers could bypass a
paywall. The decision was to **leave it as-is**, because:

- Nothing paid exists to bypass — `/plus/` is free and ungated
- The concierge offer sells **human delivery**, which cannot be pirated
- Moving it server-side would break offline/PWA findings and force every visitor's
  answers to leave the device, contradicting the privacy copy

The exposure is **competitive** (rules are copyable), not a security hole.

> ### ⚠️ TRIGGER — READ THIS BEFORE BUILDING ANY PAYWALL
>
> **The moment findings are sold as an automated product, the rules engine MUST move
> into `api/src/`.** A client-side paywall is unenforceable — the logic runs on the
> attacker's machine, so any JS gate is deleted in DevTools in ten seconds.
>
> Agreed design: the browser keeps the **questions** (users read them anyway, so they
> cannot be hidden), the **Worker runs the engine** and checks entitlement before
> returning findings. The engine is already pure functions with no DOM dependency, so
> the move is contained.
>
> **Do not build a client-side paywall. It is theatre.**

### Also considered and rejected for now

- **Strix** (github.com/usestrix/strix) — a legitimate autonomous pentest agent
  (Apache 2.0, needs Docker + a paid LLM API key). Skipped because it targets surface
  Tax.cal does not have (no login, no roles, no payments, parameterised SQL), the
  rate limiter would throttle it into noisy results, and it cannot test account
  security, which is the actual risk. **Worth running once payments or accounts exist.**
- **Content-Security-Policy** — real defence-in-depth, but GitHub Pages cannot set
  headers, so it needs a `<meta>` tag with per-script hashes that break on every edit.
  Deferred as low marginal value while zero third-party JS ships.
- **`localhost:8765` in the Worker's CORS allowlist** — looks like a finding, is not.
  With no cookies or sessions, CORS protects nothing here; the token is the real
  access control and an attacker would just use curl. Removing it would break local
  development for no security gain.

---

## 11. Legal and privacy position

- Privacy policy is live at `/privacy/`, linked from both footers, and lists Siddhesh
  by name, India as the country, and `siddheshthapa02@gmail.com` as contact.
- Data stored for a saved review: answers, country/region/gross/marginal rate,
  findings snapshot, created and expiry dates. **No name, no email, no password,
  no IP.**
- Suppliers named: GitHub Pages, Cloudflare, Formspree, **Plausible**, Google Fonts. No
  advertising, tracking pixels or session recording.
- **Analytics, added 12 September 2026.** Plausible, on every page. The privacy page
  carries a dedicated section, *"We measure traffic, not people"*: no cookies, no
  persistent identifier, cannot follow anyone across sites, records
  page/referrer/rough country/device/browser and **discards the IP rather than storing
  it** — and critically, **it never sees anything the visitor types**. It also states
  plainly that a tracker blocker will stop it and the site still works. Plausible is an
  EU company storing data in the EU, which suits a UK/EU audience.
- Rights section covers access, correction, deletion, restriction, objection and
  complaint — with access and deletion built into the page itself.

**Open exposure, unresolved:** Siddhesh is an Indian sole operator storing financial
data about UK and EU residents. The architecture minimises this as far as it reasonably
can (no identity stored, self-service erasure, one-year expiry, EU data location). But
**a professional review of the GDPR position is still outstanding and should happen
before money changes hands.** This document is not legal advice.

---

## 12. Maintenance — updating for a new tax year

> **Superseded 2 October 2026: follow `docs/UPDATING_TAX_RULES.md`** (11 steps: official sources →
> `packages/tax-core/src/rules/<cc>.js` → sources/versions/`period`/`lastVerified` → hand-calculated
> tests → `npm test` → `npm run build:all` → bump `sw.js` + `?v=` → redeploy MCP → verify plugin →
> update plugin docs). The Plus `LIMITS` step below still applies. The rest is historical.

Almost everything is data. Each April/January when rates change:

1. **Income-tax brackets** → `assets/tax-engine.js`, the tables at the top. Each is
   dated and was validated against published take-home figures.
2. **VAT/sales %, fuel share, category assumptions, US states, CA provinces, tips,
   `SAVINGS_CAP`** → `assets/tax-data.js`.
3. **Plus rule ceilings** → `LIMITS` at the top of `assets/plus-engine.js`
   (pension/401k/HSA/RRSP/FHSA/super/PER/Rürup/fondo pensione amounts).
4. **Bump TWO numbers every time, not one:** `CACHE = 'taxcal-vN'` in `sw.js` *and* the
   matching `?v=N` on the asset URLs in `index.html`, `plus/index.html` and
   `privacy/index.html`. Currently **v18**. The query string is the part that actually
   defeats the browser's own HTTP cache (GitHub Pages serves assets with
   `max-age=600`); the CACHE bump alone is not enough. This is documented at the top of
   `sw.js` too. `build-artifact.mjs` tolerates the query string when inlining.
5. Re-run both build scripts.

**Adding a country:** add an entry to `COUNTRIES` in `tax-data.js`, a `case` in
`directTaxFor()` in `tax-engine.js`, a question set in `plus-questions.js`, and rules
in `plus-engine.js`.

---

## 13. Deployment

**The site:** push to `main`. GitHub Pages deploys automatically, usually within a
minute or two. Always run the builds first if `assets/` or `styles.css` changed:

```
node build-artifact.mjs
node build-country-pages.mjs
```

**IndexNow runs itself.** `.github/workflows/indexnow.yml` fires on every push to `main`
(and manually via *Actions → IndexNow → Run workflow*). It:

1. finds the key by looking for the one `*.txt` at the repo root whose content equals its
   own filename — so the key is never typed into the workflow, and **the run fails if a
   second such file ever appears**;
2. waits for Pages to publish the push, checking every 30s until the live `sitemap.xml`
   matches the committed one (line endings ignored), for up to 10 minutes — after that
   it warns and submits the live copy;
3. collects every `<loc>` and batch-POSTs them to `https://api.indexnow.org/indexnow`.

It **fails the run** if the sitemap can't be fetched, has no URLs, or IndexNow returns
anything other than 200 or 202 (202 means received, key check pending). The log prints
the URL count, the status and the response body. Python standard library only; it
touches no site files and needs no secrets.

It submits **all** sitemap URLs on every push, including pushes that change nothing on
the site — harmless, since IndexNow accepts repeats. **New pages are only submitted if
they are in `sitemap.xml`**, so adding a page without adding it to the sitemap means
IndexNow never hears about it.

First run: commit `ea68250`, Actions run `34743327393`, success, 14 URLs. IndexNow serves
Bing, Yandex, Seznam, Naver and others — **not Google**, which still relies on the sitemap
and Search Console.

**The Worker:** from `api/`, `npx wrangler deploy`.

**The MCP server (ChatGPT plugin), from the repo root:**
`npx wrangler@4 deploy --config mcp/wrangler.toml --env staging`, smoke-test with
`npm run mcp:smoke -- https://taxcal-mcp-staging.onepanda2.workers.dev/mcp`, then
`--env=""` for production. Set the GitHub repository variable `MCP_URL` to turn on the
six-hourly health-check workflow (`.github/workflows/mcp-health.yml`).

**Before any push to `main` (since 2 Oct 2026):** `npm test` must be fully green and
`npm run build:all` run, regenerated files committed. CI runs the tests on every push.

**Local preview:** `python -m http.server 8765 --bind 127.0.0.1` from the project root.
For a local worker, `npx wrangler dev --local --port 8787` and add **`?api=local`** to
the page URL — without that flag local pages talk to the **production** worker and
would write rows to the live database.

---

## 14. Known limitations and simplifications

All are labelled as estimates in-app, but a future maintainer should know:

*(Updated 2 October 2026 — several were fixed in the engine rewrite.)*

- **UK:** England/Wales/NI bands only — **Scotland is not modelled.**
- **US:** Single and Married-filing-jointly only; **no Head of Household**; no local
  city taxes (e.g. NYC). State tax outside California is a **proxy**, labelled low confidence.
- **Canada:** Quebec now uses QPP/QPIP and the federal abatement (fixed). Provincial
  low-income reductions are not modelled.
- **Italy:** surcharges at Milan/Lombardy rates; below €20k tax is overstated (cash bonuses
  not modelled).
- **Spain:** a representative state + regional scale; regional variation not modelled.
- **France:** one tax part (single); barème on net taxable salary with the décote (fixed).
- **India:** salaried individuals only — no business income, capital gains, HUF, foreign
  income, TDS or ITR.
- Cross-country comparison converts at **approximate** FX rates and shows direct tax only.
- Indirect tax is a category-level effective-rate estimate, with confidence labels.
- Country landing pages are content + CTA; they do not embed the calculator.

---

## 15. Bugs found and fixed — do not reintroduce these

These cost real time to find. Each is a trap that will recur.

1. **The `$'` build bug (severe).** `build-artifact.mjs` must pass a **function** to
   `String.replace` when inlining CSS/JS. As a plain string, `$` sequences are
   replacement patterns — and `symbol: '$'` in `tax-data.js` contains `$'`, which means
   "everything after the match" and silently spliced the document tail into the middle
   of the data file. **Both `dist/` builds and the published artifact were serving
   invalid JavaScript.** The build now asserts the inlined CSS and JS match their
   sources byte-for-byte.

2. **Half-added region data (severe).** A country with `regionType` / `regionLabel` /
   `regionDefault` missing renders **no region selector**, and `usStateTax` and
   `catFraction` then return **0** rather than erroring. This shipped: **every US
   visitor saw federal + FICA only, with no state income tax and no sales tax at all.**
   `compute()` now validates the region against `regionTable` and falls back to a real
   default.

3. **`wrangler.toml` `[vars]` overriding a secret.** A `[vars]` entry beats a secret of
   the same name on **every deploy**. `RATE_SALT` was declared under `[vars]`, so
   `wrangler secret put` was silently undone by the next deploy. Watch for
   `env.RATE_SALT ("taxcal-default-salt")  Environment Variable` in deploy output —
   that means a var is winning. **Do not re-add it to `[vars]`.**

4. **Marriage Allowance quoted to higher-rate earners.** The rule fired regardless of
   band. Gating on `ctx.marginalRate` made it worse, because the UK marginal rate
   includes National Insurance so a basic-rate payer reads as ~28%, not 20%. It is now
   gated on the **income-tax band** (`ctx.gross <= 50270`).

5. **Sitemap namespace typo.** `www.sitemap.org` instead of `www.sitemaps.org`. Google
   matches that string exactly and would have rejected the sitemap as unsupported.

6. **Dark-mode dropdown invisible.** The native `<select>` popup is painted outside
   `.control`, so it inherited light text with no background. Fixed by giving
   `option`/`optgroup` an explicit background/colour pair.

7. **Service worker served stale JavaScript with fresh HTML (severe).** `sw.js` was
   network-first for the HTML document but **cache-first for JS and CSS**, so after a
   deploy a returning visitor got the new `index.html` paired with the previous
   deploy's `app.js`. When `#usFields` became `#regionFields`, that combination threw
   on load and the page rendered **empty spend fields and a 0% rate**. Reported by
   Siddhesh as a homepage design problem; it was a bug. Own code is now network-first
   with a cache fallback; icons and fonts stay cache-first.

8. **`max-age=600` reproduced the same mismatch at browser level.** The SW fix was
   necessary but insufficient — GitHub Pages serves assets with
   `Cache-Control: max-age=600`, so the browser's own HTTP cache paired fresh HTML
   with up to ten minutes of stale JS independently of the service worker. Fixed by
   versioning the asset URLs (`?v=9`). **Bump that number alongside `sw.js` CACHE on
   every asset change** — the coupling is documented at the top of `sw.js`, and
   `build-artifact.mjs` tolerates the query string when inlining.

9. **Invalid CSS custom property** `--faint: #8598 9C;` (stray space) — caught before shipping.

10. **Two lookup tables sharing keys, silently (severe, shipped and indexed).**
    `DATA.countries` and `DATA.usStates` both contain `DE` (Germany / Delaware) and `CA`
    (Canada / California). The country-page comparison dispatch tested `usStates[k]`
    first and fell through to countries, so `DE` resolved to **Delaware**. Four pages —
    uk, australia, france, netherlands — were live and indexed saying *"the USA
    (Delaware) would tax the same pay at about 18%"* where the prose promised Germany.
    `CA` was the same bug, dormant only because no page happened to compare against
    Canada. **Fix:** a US state target is now written explicitly as `st:TX`, and both
    lookups throw on an unknown key rather than producing a plausible-looking wrong page.
    Found by a Cowork session reviewing the repo before drafting launch copy.

11. **Grammar in generated pages:** "in United Kingdom" → "in the United Kingdom". A
   `the` helper handles UK/US/NL in both the page generator and `plus-app.js`.

12. **FX table had no CAD or AUD (2 Oct 2026, shipped and indexed).** `convert()` fell back to
   `1`, so Canada and Australia were compared at **US-dollar parity** on the comparison bars,
   country pages and `/tax-by-country/`. Now dated ECB rates, and an unknown currency throws.

13. **Share card printed "United States · undefined"** — it read `r.usState`, which the engine
   never returned. The card now draws from `shareCardModel(r)`, tested.

14. **Service worker cached every page as the home page (2 Oct 2026).** Navigations were stored
   under `./index.html`, so offline the calculator opened as whichever page was visited last
   (privacy, a country page). Each page is now cached under its own URL; proven by a browser
   test that actually stops the server.

15. **Cloudflare's runtime refuses a Worker whose entry module has non-handler exports.**
   `mcp/src/worker.js` exported constants and workerd failed to start — Node never showed it.
   The entry now exports only `{ fetch }`. **Always smoke-test a Worker in `wrangler dev`,
   not just in Node.**

---

## 15a. Plausible: an event with an unlisted property is DROPPED ENTIRELY

**Learned 12 September 2026, after about an hour of wrong diagnoses.**

Plausible has an allowlist at **Site Settings → Custom properties**. If an event is
sent carrying a property that is not on that list, **the whole event is discarded** —
not stored with the property stripped. It simply never appears, with no error anywhere.

How it presented: `email_signup` (property `country`, allowlisted) registered fine,
while `signup_failed` (property `status`, not allowlisted) was invisible. Adding
`status` to the allowlist made it appear immediately.

**Operational rule: whenever a new event property is introduced in code, add it to the
Plausible allowlist in the same change, or the event vanishes silently.**

Currently allowlisted: `country`, `status`.

### Event tracking — what was wrong and how it works now

Siddhesh added the first two events himself. Three corrections were needed:

**Signups were over-counted.** `fetch` only rejects on a *network* failure, so a 4xx or
5xx from Formspree still resolved and fired `email_signup`. A rejected submission counted
as a signup, inflating the one number the next decision rests on. Now gated on `res.ok`.

**Activation was badly under-counted.** `calculate` fired only on the "Show my real tax
rate" button — which sits ~3,500px down the page past six spending fields, while the
results are visible on load and recompute live as you type. Measured on the live site:
changing the salary took the rate from 24% to 33% and fired **nothing**. Someone could
land, enter their own salary, read their real rate and leave: fully activated, entirely
uncounted. It now fires on the **first genuine interaction of any kind** — salary,
country, spending, or the button — capped once per page load via `markActivated()`.

**Failures were invisible, which is worse than the failure.** The form said "You're on the
list" whether or not Formspree accepted it, and with the `res.ok` guard a rejection
produced no event either — so a broken signup looked identical to a working one from both
sides. A failed submission now fires `signup_failed` with the HTTP status and tells the
visitor plainly it did not work, with an address to reach instead.

**A diagnostic lesson from this, worth keeping:** the tracking code was provably correct
(stubbing `ok:true` fired the event, `ok:false` correctly suppressed it) while real
submissions produced nothing — and the conclusion drawn was that Formspree must be
rejecting them. It wasn't; the emails were all there. The actual cause was Siddhesh's
browser running cached JavaScript from before the events existed. **Before theorising
about any unexpected behaviour on this site, check which JavaScript the browser actually
loaded:** `[...document.scripts].map(s=>s.src).filter(Boolean)`.

### The three goals, and what each actually measures

| Goal | Fires when | Property |
| --- | --- | --- |
| `calculate` | **first genuine interaction** of any kind — salary, country, spending, or the reveal button — capped once per page load | `country` (the one *selected*, not the IP country) |
| `email_signup` | Formspree returned a 2xx | `country` |
| `signup_failed` | Formspree returned non-2xx, or the request failed | `status` (HTTP code, or `network`) |

`calculate` deliberately does **not** require the "Show my real tax rate" button. That
button sits ~3,500px down the page while results are visible on load and recompute live
as you type — measured: changing the salary moved the rate 24% → 33% and fired nothing.
Counting only the click under-reported activation badly.

**Note on the baseline:** the first few conversions on each goal are test events fired
during setup, including one `signup_failed` with `status: 999-test`. The real baseline
starts after that.

## 15b. GitHub Pages deploys via an Action — and the runs API lies

**Two things worth knowing, 12 September 2026.**

**1. Never disable GitHub Actions.** Pages publishes through a workflow named
**"pages build and deployment"**, which *is* a GitHub Action. Disabling Actions would
stop the site publishing entirely, silently — pushes would land on `main` and never go
live. Actions permissions must stay **"Allow all actions and reusable workflows."**
(An earlier hardening suggestion in this project wrongly recommended disabling them.
It was never actually applied, but do not act on it.)

**2. The Actions runs API is cached and will mislead you.**
`api.github.com/repos/OnePanda2/Tax.cal/actions/runs` returned a list whose newest entry
was several commits behind reality, while the site was demonstrably serving content from
those later commits. Concluding "no run exists, therefore Actions is off" from that
listing is wrong — it cost about twenty minutes here.

**Reliable way to check what is actually published:** request the file with a unique
query string to bypass the CDN edge cache, and grep for a marker unique to the commit
you are waiting on:

    curl -s "https://taxcal.siddheshthapa.com/assets/app.js?b=$RANDOM" | grep -c '<marker>'

Pick the marker from the new code itself, not from something an earlier commit also
contained — an earlier mistake here was waiting on `email_signup`, which a previous
deploy already had, so the wait returned instantly against old code.

## 15c. Content assets, and the drafts kept outside the repo

**Live and indexable — 14 URLs, all generated from one engine**, so no page can contradict
the calculator or another page:

| URL | What it targets |
| --- | --- |
| `/` | the tool itself |
| `/country/<10 slugs>/` | *"how much tax do I really pay in X"* |
| `/hidden-tax/` | the methodology — the credibility page |
| `/tax-by-country/` | *"which country taxes you most"* |
| `/privacy/` | disclosure |

**`/hidden-tax/`** (blog post #1, written by a Cowork session, reviewed here) explains how
the number is made rather than what anyone should do — the only publishable version given
nobody on the team is qualified. Its *"what the number leaves out"* section is the asset:
it is the page to point at when someone says the model is wrong.

**`/tax-by-country/`** (blog post #2) applies the same method across all ten and ranks
them. Germany 45.9% to Australia 19.3%, a 27-point spread. The finding worth the page: the
gap between payslip and reality is **not** a constant — about 4 points across the eurozone
countries, about 2 across the US, Canada and Australia, because VAT is a fifth of most
prices while US sales tax is a few per cent and often skips groceries. That is the one
thing this tool can say that a take-home-pay calculator cannot.

Four caveats have their own section on that page rather than being buried, because without
them the table reads as advocacy: not a cost-of-living comparison, not a verdict on value
(Germany tops it partly by funding healthcare others pay for separately), one specific
filer, and a rough currency conversion — so trust the ranking over the individual figures.

### Launch drafts, all in `F:\Projects\Handovers\` beside this file, none posted anywhere

| File | Contents |
| --- | --- |
| `Tax.cal - Show HN draft.md` | three title options, body, and prepared positions for the eight comments you will actually get — including the strongest objection (adding VAT to income tax is conceptually confused; the answer is to concede the terminology and keep the ratio) and the one not to bluff on (no tax qualification) |
| `Tax.cal - Directory listings.md` | six platforms, each with genuinely different copy. Product Hunt written but marked do-not-submit-yet |
| `Tax.cal - Twitter drafts.md` | two threads, six standalone tweets, every figure verified against the engine |
| `Tax.cal - Cowork Prompt.md` | the prompt that produced the above, with the constraints baked in |

**Every figure in those drafts came from the engine and was re-verified after writing.**
If a rate in `assets/tax-data.js` changes, they go stale — re-run the numbers before
reposting anything.

**The content line that must never be written:** the growth report repeatedly suggests
"tax-saving tip" posts, e.g. *"maxing your pension cuts your next pound's tax by 40–45%"*.
That is a tax rule, with a number, in Siddhesh's voice, from an unqualified source. The
whole content line is cut, not softened.

## 16. Open items — what is actually left

**Blocking nothing, but genuinely outstanding:**

1. **Verify the contact email discrepancy** (§3). Highest priority; it is a one-letter
   difference that breaks both GDPR requests and paying customers. (Still open 2 Oct 2026;
   `/support/` links to the privacy contact line, so one fix covers both.)
1a. **ChatGPT plugin — deploy and submit** (added 2 Oct 2026). Follow
   `docs/OPENAI_SUBMISSION.md`: wrangler login → deploy staging → smoke → deploy production →
   set `MCP_URL` → test in ChatGPT developer mode → record a ~3-min walkthrough video (script
   in the doc) → verify the OpenAI org → upload `dist/taxcal-plugin.zip` (`npm run plugin:zip`)
   → domain verification via `OPENAI_APPS_CHALLENGE` → submit. No reviewer account needed.
1b. **`/terms/` has no governing-law clause** and has not been reviewed by anyone qualified.
1c. **Decide whether this handover file should stay in the public repo** (see the header).
2. **Confirm 2FA is on** for GitHub and Cloudflare.
3. **GitHub Support request** — the history rewrite removed two private strategy docs
   from `main`, but commit `3e3cb27`'s raw URLs still returned content, because GitHub
   retains unreachable objects until garbage-collected. Ask Support to *"garbage-collect
   unreachable objects and purge cached views for OnePanda2/Tax.cal"* and explicitly
   **not to alter `main`**. Until done, treat those documents as disclosed.
4. **Test "Save my review"** from a second network/device. The Worker is proven by
   direct API calls, but a browser save was never confirmed end to end because
   Siddhesh's network dropped the host repeatedly during testing.
5. **Bing Webmaster Tools** (~90 seconds, "Import from Google Search Console"). Not for
   submitting URLs — IndexNow already does that — but to open its IndexNow report and
   confirm Bing is receiving them.
6. **Directory listings** for permanent backlinks.
7. **Brief the UK and Canada friends** using §9.
8. **Professional GDPR review** and the Merchant-of-Record decision, before taking money.

**Deliberately not done:**

- No payment gateway (see §7)
- No paywall (see §10 — and read the trigger before building one)
- Plus is free and ungated
- Results are stored only when the user presses Save

**A note on network flakiness:** during the final sessions, `taxcal.siddheshthapa.com`
and the Worker host both intermittently returned `000` (connection timeout) from
Siddhesh's machine while `github.com` and `cloudflare.com` returned 200, then recovered
minutes later. This repeated many times. It is **not** a deployment problem. If
something looks broken, retry before debugging.

---

## 17. Working style — what Siddhesh wants

- **Blunt, high-signal, concise.** No padding, no flattery.
- **Feynman-style plain English when he asks for it** — he uses that phrase and means it.
- He is a **solo founder, ex-sales, non-technical-ish**. Explain the *why*, not just the *what*.
- He makes the business calls; he expects the engineering calls to be made and defended.
- **He values being told when he is wrong.** He corrected a factual error of mine
  mid-project and expected the correction to be acted on, not argued with.
- He cares about his **GitHub contribution graph**. All commits are authored as
  `siddeshthapa02@gmail.com` and are verified as linked to `OnePanda2`. Contribution
  days on record: 2026-09-06, 2026-09-08, 2026-09-09, 2026-09-12, 2026-09-13,
  2026-09-16, 2026-10-02. Commits made by Claude set `GIT_AUTHOR_NAME/EMAIL` to this
  identity so they count. **Never rewrite history without
  checking the impact and taking a backup bundle first.**
- **Speed matters to him**: *"We'll do whatever helps us get our first customer as soon
  as possible."* Weigh that against correctness, and say so when they conflict.

---

## 17b. What happened on 12 September 2026 — 16 commits

The longest working day on the project. In rough order:

1. **Plausible analytics** added site-wide, including into `build-country-pages.mjs` so
   the generated pages keep it. Privacy page corrected — it had claimed no third-party
   analytics — plus two absolute storage claims made precise ("nothing stored" →
   "your figures never leave your device").
2. **Event tracking** written by Siddhesh, then corrected here: `res.ok` gating,
   `country` as a property on both events, activation redefined to the first real
   interaction, and `signup_failed` added so a broken form cannot hide.
3. **Homepage first screen rebuilt** to demonstrate before asking — a live worked example
   (24% real vs 20% payslip, +3.8 hidden) instead of *"Example numbers — change the
   salary above"*. Plus a persistent early-access button that hides itself when the real
   form is on screen.
4. **Two caching bugs fixed**, which between them had been serving a broken page to every
   returning visitor after every deploy: the service worker was cache-first for JS, and
   GitHub Pages' `max-age=600` reproduced the same mismatch at browser level. Fixed with
   network-first for own code plus versioned asset URLs.
5. **Concierge offer removed** entirely — no price appears anywhere on the site now.
6. **Delaware/Germany key collision** found and fixed on four indexed pages.
7. **Two blog posts published**, both generated from the engine.
8. **Reddit rules verified** — three of the four relevant subs prohibit this outright.
9. **Launch drafts written** for Show HN, six directories, and Twitter.
10. **Google indexing requested** for the homepage and `/hidden-tax/`.

**The pattern worth carrying forward:** three separate problems presented as different
bugs — a huge arrow, a missing button, dead analytics — and all three were the same thing,
something cached serving a different reality than the one being reasoned about. Two of the
day's wrong diagnoses came from trusting what *should* have been loaded. Check what
actually loaded first.

## 17c. 13 September 2026

- **IndexNow automated.** Siddhesh generated a key, uploaded the key file to the repo
  root via GitHub's web UI (commit `93dd41e`) and verified a manual submission returned
  200. A workflow (`ea68250`) now submits every sitemap URL on each push; first run
  succeeded. Details in §13.
- A local gotcha along the way: the key file also existed as an **untracked copy** in the
  local folder, which blocked `git pull`. It was byte-identical to the committed one, so
  it was deleted and the pull completed. **Files uploaded through GitHub's web UI must be
  pulled locally before the next local commit.**
- **`/tax-by-country/` to Bing:** requested, and it is already covered — the IndexNow
  workflow's first run submitted all 14 sitemap URLs, this one included, and Bing takes
  IndexNow submissions. No manual Bing Webmaster Tools submission was made. Whether Bing
  has actually received it can only be seen in Bing Webmaster Tools → IndexNow, which
  needs Siddhesh's sign-in.

## 17d. 2 October 2026 — shared engine, India, ChatGPT plugin

Seven commits to `main` (`a5767d7` … `c63d463`, plus this handover update). Siddhesh asked for
Tax.cal to become two surfaces — the website and a ChatGPT plugin — on one deterministic engine,
with India added, everything sourced, and the plugin ready to submit.

1. **One engine.** `packages/tax-core` replaced `tax-data.js`/`tax-engine.js`. Every rule set
   carries `ruleVersion` (e.g. `IN-2026-27-v1`), `period`, `lastVerified`, sources, assumptions,
   exclusions and per-component confidence. `docs/TAX_RULE_SOURCES.md` is generated from it.
2. **All ten countries re-verified for 2026** — Germany had 2025 values labelled 2026; France,
   Italy and Spain charged income tax on gross pay; Canada lacked credits and Quebec's
   abatement; Australia lacked LITO and the $1,000 work deduction; Ireland's PRSI rise was
   applied all year; UK taper fixed; plus the FX and share-card bugs (§15 12–13).
3. **India** (#11): Tax Year 2026-27 under the Income-tax Act, 2025, plus the legacy FY 2025-26
   (AY 2026-27) rule set; new vs old regime, rebate and surcharge marginal relief, 4% cess,
   break-even deductions, GST/fuel estimates, `/country/india/`. ₹15L → ₹97,500;
   ₹20L → new ₹1,92,400 vs old ₹4,13,400.
4. **MCP server** (`mcp/`): 4 read-only tools (`calculate_tax`, `compare_tax_regimes`,
   `get_tax_rules`, `compare_countries`), MCP 2026-07-28 and 2025 protocols, strict validation,
   **never logs or stores inputs**, rate limit, 32 KB / 10 s body limits, security headers.
   Verified with the official MCP SDK clients and inside Cloudflare's runtime.
5. **Plugin package** (`taxcal-plugin/`): manifest, skill, 5 positive + 3 negative review cases,
   logo; `npm run plugin:zip` checks OpenAI's limits and scans for secrets.
6. **Privacy page** now separates website / Plus / ChatGPT and states: *"For the ChatGPT
   integration, your tax inputs are sent to Tax.cal's calculation service to perform the
   requested calculation. Tax.cal does not retain those inputs for ordinary calculation
   requests."* New `/terms/` and `/support/`.
7. **Tests: 120**, CI green; browser smoke test 40+ checks incl. offline PWA.
8. **Cost:** still ~$0/month (GitHub Pages + Cloudflare Workers free plan).

**Analytics for the plugin, privacy-safe:** the MCP server's one log line per request
(tool, country code, ok/error code) *is* the analytics — usage by country, India share,
error and unsupported rates. Repeat usage is deliberately unmeasurable (no user id).

**What to build next:** deploy + submit the plugin; an India question set for Plus; Scottish
bands; exact US state schedules; an Indian HRA calculator.

## 18. HANDOVER PROMPT — paste this into a new session

```
I'm Siddhesh, solo founder of Tax.cal. You're picking up a project that is already
live and shipped. Before doing anything, read the full project record at:

    PROJECT-HANDOVER TaxCal.md   (repository root)

It is the complete record and this chat has no prior context. Also read CLAUDE.md.

Quick orientation:
- Tax.cal shows people their REAL total tax burden (income tax + social contributions
  + VAT/sales tax + fuel duty) across 11 countries (incl. India), free, client-side.
  One engine in packages/tax-core also powers a ChatGPT plugin (mcp/, taxcal-plugin/).
- Tax.cal Plus is a bespoke per-country questionnaire (50 base questions across 10
  countries) feeding an 88-rule engine that returns a ranked list of legal ways to pay
  less tax. It is currently FREE and UNGATED.
- There is currently NO revenue path: the concierge offer was removed on 12 Sep 2026
  (§7). There is NO payment gateway and that is deliberate.
- Live at https://taxcal.siddheshthapa.com, repo github.com/OnePanda2/Tax.cal (PUBLIC),
  backend is a Cloudflare Worker + D1.

Non-negotiables, all explained in the handover file:
1. Never turn the savings estimate into a promise. It is a typical-case model, not a
   personal finding, and the copy must keep saying so.
2. Findings say what to CHECK, never what is true of the user. No invented numbers —
   show nothing rather than a fabricated figure.
3. If storage behaviour changes, the privacy copy changes in the SAME commit.
4. Never build a client-side paywall. If we sell automated findings, the rules engine
   moves into the Worker first. See the TRIGGER section.
5. India is back (2 Oct 2026) — keep it, with no special "free for India" logic.
6. Bump sw.js CACHE and every ?v= together on asset changes; run `npm test` (green)
   and `npm run build:all` before pushing main.
7. The model never does tax arithmetic; the MCP server never logs or stores inputs.

Talk to me bluntly and concisely. Explain the why, not just the what. Tell me when
I'm wrong. My priority is getting the first paying customer.

Start by reading PROJECT-HANDOVER TaxCal.md, then tell me what you think the single highest-
value next action is and why.
```

---

## 19. One honest closing assessment

The engineering is done and it is genuinely solid: real tax math validated against
published figures, a defensible honesty position in every piece of copy, a backend
designed so a breach exposes nobody, and zero third-party attack surface.

**None of that is the constraint.** The site has no traffic. A brand-new domain takes
weeks to rank, Siddhesh cannot demo in person, and until today there was no way for an
interested person to pay at all.

The single highest-value action is not another feature. It is **getting one real
salaried person in a target country to complete the questionnaire and react to the
number** — because that tells you whether the hook works, and everything downstream
depends on it.

The thing most likely to kill this project is not a hacker, a bug, or a missing
feature. It is that nobody shows up.
