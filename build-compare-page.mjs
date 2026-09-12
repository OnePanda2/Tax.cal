/* ============================================================================
   Blog post #2 — /tax-by-country/
   "The same salary, ten countries"

   Every figure comes from the live engine at build time, for the same reason
   build-country-pages.mjs and build-guide-pages.mjs do: a hand-written table
   would drift from the calculator the first time a rate changed, and a page
   that contradicts the tool is worse than no page.

   Run:  node build-compare-page.mjs   →   tax-by-country/index.html
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const g = { window: {} };
global.window = g.window;   // the asset files assign to window
const load = (f) => (0, eval)(readFileSync(new URL('./assets/' + f, import.meta.url), 'utf8'));
load('tax-data.js'); load('tax-engine.js');
const DATA = g.window.TAXCAL_DATA, ENGINE = g.window.TaxEngine;

const SITE = 'https://taxcal.siddheshthapa.com';
const SLUG = 'tax-by-country';
const BASE_GBP = 50000;          // the reference salary, before conversion

const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const noDot = (s) => String(s).replace(/\.\s*$/, '');

/* Build one row per country: the same £50,000 converted at approximate rates,
   with spending set to the app's own default share of gross so the comparison
   is like-for-like rather than picking flattering numbers per country. */
const rows = DATA.order.map((k) => {
  const c = DATA.countries[k];
  const gross = Math.round(ENGINE.convert(BASE_GBP, 'GBP', c.currency.code) / 500) * 500;
  const spend = {};
  DATA.categories.forEach((cat) => { spend[cat.id] = Math.round((gross / 12) * cat.def / 10) * 10; });
  const r = ENGINE.compute({ countryKey: k, gross, filingStatus: 'single', region: c.regionDefault, spend });
  const fmt = new Intl.NumberFormat(c.currency.locale, { style: 'currency', currency: c.currency.code, maximumFractionDigits: 0 });
  return {
    key: k, name: c.name, flag: c.flag, note: c.note,
    salary: fmt.format(gross),
    direct: r.directRate, eff: r.effRate,
    hiddenPts: r.hidden / r.gross,
    consumptionName: c.consumptionName,
    slug: { UK: 'uk', US: 'usa', CA: 'canada', AU: 'australia', IE: 'ireland',
            DE: 'germany', FR: 'france', NL: 'netherlands', ES: 'spain', IT: 'italy' }[k]
  };
}).sort((a, b) => b.eff - a.eff);

const top = rows[0], bottom = rows[rows.length - 1];
const spread = (top.eff - bottom.eff) * 100;

// Which countries lean hardest on tax you never see?
const byHidden = rows.slice().sort((a, b) => b.hiddenPts - a.hiddenPts);
const mostHidden = byHidden[0], leastHidden = byHidden[byHidden.length - 1];
const euro = rows.filter((r) => ['DE', 'FR', 'NL', 'ES', 'IT', 'IE'].includes(r.key));
const anglo = rows.filter((r) => ['US', 'CA', 'AU'].includes(r.key));
const avg = (a) => a.reduce((s, r) => s + r.hiddenPts, 0) / a.length;

const title = `Which country taxes you most? The same salary in 10 countries (2026)`;
const desc = `The same £${BASE_GBP.toLocaleString()} salary, converted and run through ten countries' 2026 tax rules — including the VAT and fuel duty that never appears on a payslip. ${top.name} takes ${pct(top.eff, 0)}, ${bottom.name} ${pct(bottom.eff, 0)}.`;

const faq = [
  ['Is this the same as comparing the cost of living?',
   `No, and it is important not to read it that way. This converts one salary at approximate exchange rates and applies each country's tax rules to it. It says nothing about what a salary buys once you have paid the tax, and nothing about what the tax pays for.`],
  ['Why is the same salary a different number in each country?',
   `Because it is converted. ${esc(BASE_GBP.toLocaleString())} pounds becomes roughly ${esc(euro[0] ? euro[0].salary : '')} in the eurozone countries at the approximate rates used here. That conversion is a rough one, and a different rate would move every figure a little.`],
  ['Does a higher rate mean a worse deal?',
   `This page cannot tell you that. ${esc(top.name)} appears at the top of the table, and a large part of what it collects funds healthcare that people elsewhere pay for separately out of the income the table shows them keeping. A tax rate on its own is not a verdict.`],
  ['How exact are these figures?',
   `The direct tax — income tax, social contributions, state or provincial tax — comes from each country's published 2026 brackets and is accurate for a single earner with no other income. The indirect portion is an estimate, because a real shopping basket mixes items taxed at different rates. The method is written up separately.`],
  ['Who is this calculated for?',
   `One person, employed, no children, no pension contributions beyond whatever is mandatory, and spending set to the same share of gross pay in every country. Change any of those and the ranking can change with it.`]
];

const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } }))
};

const tableRows = rows.map((r, i) => `
        <tr>
          <td class="tnum"><b>${i + 1}</b></td>
          <td><span class="em">${r.flag}</span><a href="../country/${r.slug}/">${esc(r.name)}</a></td>
          <td class="tnum">${esc(r.salary)}</td>
          <td class="tnum">${pct(r.direct)}</td>
          <td class="tnum"><b>${pct(r.eff)}</b></td>
          <td class="tnum">+${pct(r.hiddenPts)}</td>
        </tr>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${SLUG}/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/${SLUG}/">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../icons/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../styles.css?v=18">
  <!-- Privacy-friendly analytics by Plausible -->
  <script async src="https://plausible.io/js/pa-Wj_1OavoJ4_-NVQlAh9IK.js"></script>
  <script>
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init()
  </script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Tax.cal', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Which country taxes you most', item: `${SITE}/${SLUG}/` }] })}</script>
<style>
  .guide p{color:var(--muted);font-size:15.5px;line-height:1.65;margin:0 0 14px}
  .guide p b,.guide p strong{color:var(--ink)}
  .guide h2{margin:0 0 4px}
  .gtable{width:100%;border-collapse:collapse;font-size:14.5px}
  .gtable th{text-align:left;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 10px 8px 0;border-bottom:1px solid var(--line-strong);white-space:nowrap}
  .gtable td{padding:11px 10px 11px 0;border-bottom:1px solid var(--line);color:var(--ink)}
  .gtable tr:last-child td{border-bottom:0}
  .gtable .em{margin-right:7px}
  .gtable .tnum{white-space:nowrap;font-variant-numeric:tabular-nums}
  .gtable a{color:var(--ink)}
  .gtable a:hover{color:var(--brand-ink)}
  .scroll-x{overflow-x:auto}
  .spreadbar{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 6px}
  .spreadbar .n{font-family:var(--font-display);font-weight:800;font-size:clamp(34px,7vw,48px);line-height:1;letter-spacing:-.03em;color:var(--tax-strong);font-variant-numeric:tabular-nums}
  .spreadbar .t{color:var(--muted);font-size:16px;flex:1 1 240px}
  .caveat{border-left:3px solid var(--tax);padding:2px 0 2px 16px;margin:0 0 14px}
  .caveat p{margin:0}
</style>
</head>
<body>
<script>try{var t=localStorage.getItem('taxcal_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>

<header class="site-head"><div class="wrap">
  <a class="brand" href="../index.html" style="text-decoration:none;color:inherit">
    <svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#0694A2"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="15" fill="url(#bg)"/><g fill="none" stroke-width="7.4" stroke-linecap="round"><circle cx="32" cy="32" r="15.5" stroke="#fff"/><path d="M32 16.5 A15.5 15.5 0 0 1 45.4 40.2" stroke="#F59E0B"/></g></svg>
    Tax<span class="dot">.cal</span>
  </a>
  <span class="head-spacer"></span>
  <span class="pill"><span class="blip"></span>Estimates</span>
</div></header>

<main class="wrap guide">
  <section class="hero">
    <p class="eyebrow">Comparison · 2026 rates</p>
    <h1>The same salary, ten countries</h1>
    <p class="lede">One salary of <strong>£${BASE_GBP.toLocaleString()}</strong>, converted and run through ten countries' tax rules — counting not just income tax and social contributions but the <strong>${esc(rows[0].consumptionName.toLowerCase())} and fuel duty</strong> that never shows up on a payslip.</p>
  </section>

  <div class="card pad" style="margin-top:20px">
    <div class="spreadbar">
      <span class="n">${spread.toFixed(0)} pts</span>
      <span class="t">separates the top of this table from the bottom. ${esc(top.name)} takes <b>${pct(top.eff)}</b> of that salary; ${esc(bottom.name)} takes <b>${pct(bottom.eff)}</b>.</span>
    </div>
  </div>

  <div class="card pad" style="margin-top:16px">
    <div class="sec-title"><div><span class="kicker">The table</span><h2>Ranked by total tax burden</h2></div></div>
    <div class="scroll-x">
      <table class="gtable">
        <thead><tr><th>#</th><th>Country</th><th>Salary</th><th>Direct tax</th><th>Real rate</th><th>Hidden</th></tr></thead>
        <tbody>${tableRows}
        </tbody>
      </table>
    </div>
    <p class="hint" style="margin-top:14px"><b>Direct tax</b> is income tax, social contributions and any state or provincial tax — computed from published 2026 brackets. <b>Real rate</b> adds the estimated tax inside spending. <b>Hidden</b> is the difference between the two, in percentage points.</p>
  </div>

  <section class="section">
    <div class="sec-title"><div><span class="kicker">What the table hides</span><h2>Not every country hides the same amount</h2></div></div>
    <p>The interesting column is the last one. The gap between what a payslip shows and what someone actually pays is <b>not</b> a constant — it is roughly twice as large in Europe as in the English-speaking countries outside it.</p>
    <p>Across ${esc(euro.map((r) => r.name).slice(0, 3).join(', '))} and the other eurozone countries here, spending adds an average of <b>${pct(avg(euro))}</b> on top of the payslip rate. Across ${esc(anglo.map((r) => r.name).join(', '))}, it adds <b>${pct(avg(anglo))}</b>. ${esc(mostHidden.name)} hides the most at <b>+${pct(mostHidden.hiddenPts)}</b>; ${esc(leastHidden.name)} the least at <b>+${pct(leastHidden.hiddenPts)}</b>.</p>
    <p>The reason is VAT. European standard rates sit around a fifth of the price of most things, and they apply to nearly everything. US sales tax is a few per cent, set by each state, and often does not touch groceries at all. So two countries can withhold a similar amount from a payslip and still take noticeably different totals once you count the till.</p>
  </section>

  <section class="section">
    <div class="sec-title"><div><span class="kicker">Read this before you quote the table</span><h2>What it does not tell you</h2></div></div>
    <div class="caveat">
      <p><b>It is not a cost-of-living comparison.</b> One salary is converted at approximate exchange rates and taxed under ten sets of rules. What the money buys afterwards is a different question entirely, and this page does not touch it.</p>
    </div>
    <div class="caveat">
      <p><b>It is not a verdict on value.</b> ${esc(top.name)} sits at the top, and a large share of what it collects funds healthcare that people lower down the table pay for separately out of the income shown as theirs to keep. A rate on its own settles nothing.</p>
    </div>
    <div class="caveat">
      <p><b>It is one specific person.</b> Employed, single, no children, no pension contributions beyond the mandatory, and spending fixed at the same share of gross in every country. Any of those changes can reorder the table.</p>
    </div>
    <div class="caveat">
      <p><b>The conversion is rough.</b> Exchange rates move, and every figure here moves with them. Treat the ranking as more reliable than the individual numbers.</p>
    </div>
  </section>

  <section class="section">
    <div class="sec-title"><div><span class="kicker">Method</span><h2>Where these numbers come from</h2></div></div>
    <p>Direct tax uses each country's real 2026 brackets and thresholds, and is exact for the filer described above. The indirect side is genuinely an estimate: a shopping basket mixes items taxed at different rates, so one effective rate stands in for each spending category, and fuel is the roughest figure on the page.</p>
    <p>Some things are deliberately left out — council and property taxes, alcohol and tobacco duty, employer-side social contributions, and the business taxes buried inside prices. Every number above is therefore a <b>floor</b>, not a ceiling.</p>
    <p>The full method, assumption by assumption, is written up here: <a href="../hidden-tax/">how we work out the tax that isn't on your payslip</a>.</p>
  </section>

  <div class="card pad" style="margin-top:16px;text-align:center">
    <div class="sec-title" style="justify-content:center"><div><span class="kicker">Your turn</span><h2>Run it on your own salary</h2></div></div>
    <p class="hint" style="margin:-4px 0 16px">Pick your country, put in what you actually earn and spend. Takes about twenty seconds, and nothing you type leaves your device.</p>
    <a class="btn" href="${SITE}/" style="max-width:340px;margin:0 auto;text-decoration:none">Open the calculator
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    <p class="site-url">or go straight to <a href="${SITE}/">taxcal.siddheshthapa.com</a></p>
  </div>

  <div class="wrap section" style="padding-left:0;padding-right:0">
    <div class="sec-title"><div><span class="kicker">Questions</span><h2>Asked and answered</h2></div></div>
    ${faq.map(([q, a]) => `<details class="acc"><summary>${esc(q)}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body"><p>${a}</p></div></details>`).join('\n    ')}
  </div>
</main>

<footer class="foot wrap">
  <div class="disc"><strong>Estimates only.</strong> Figures use 2026 rates for a single earner, with spending assumptions and approximate exchange rates. Not tax, financial or legal advice.</div>
  <div class="row2"><a href="../index.html">← Back to Tax.cal</a><span>·</span><span><a href="../hidden-tax/">Method</a></span><span>·</span><span><a href="../privacy/">Privacy</a></span><span>·</span><span>© 2026 Tax.cal</span></div>
</footer>
</body>
</html>
`;

mkdirSync(new URL(`./${SLUG}/`, import.meta.url), { recursive: true });
writeFileSync(new URL(`./${SLUG}/index.html`, import.meta.url), html);
console.log(`wrote ${SLUG}/index.html — ${rows.length} countries, ${spread.toFixed(1)}pt spread`);
