/* Generate one SEO landing page per country ("one page for one search").
 * Each page answers "how much tax do you really pay in <country>", with real
 * numbers from the engine, FAQ schema, and a deep-link into the calculator.
 * Run:  node build-country-pages.mjs   →   country/<slug>/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const g = { window: {} };
global.window = g.window;
const load = (f) => (0, eval)(readFileSync(new URL('./assets/' + f, import.meta.url), 'utf8'));
load('tax-data.js'); load('tax-engine.js');
const DATA = g.window.TAXCAL_DATA, ENGINE = g.window.TaxEngine;

const SITE = 'https://taxcal.siddheshthapa.com';

// representative example per country: [salary, slug, usState?, compareTo[]]
const EX = {
  UK: { salary: 40000, slug: 'uk',          cmp: ['DE', 'US'] },
  US: { salary: 75000, slug: 'usa', region: 'CA', cmp: ['UK', 'TX'] },
  CA: { salary: 75000, slug: 'canada', region: 'ON', cmp: ['US', 'UK'] },
  AU: { salary: 90000, slug: 'australia',   cmp: ['UK', 'DE'] },
  IE: { salary: 50000, slug: 'ireland',     cmp: ['UK', 'NL'] },
  DE: { salary: 55000, slug: 'germany',     cmp: ['UK', 'NL'] },
  FR: { salary: 45000, slug: 'france',      cmp: ['DE', 'IE'] },
  NL: { salary: 50000, slug: 'netherlands', cmp: ['DE', 'IE'] },
  ES: { salary: 40000, slug: 'spain',       cmp: ['FR', 'IT'] },
  IT: { salary: 35000, slug: 'italy',       cmp: ['ES', 'FR'] }
};

function money(n, cur) {
  return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(Math.round(n));
}
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildSpend(salary) {
  const spend = {};
  DATA.categories.forEach((c) => { spend[c.id] = Math.round((salary / 12 * c.def) / 10) * 10; });
  return spend;
}

const TONE = { brand: 'var(--brand)', brand2: 'var(--brand-2)', brandink: 'var(--brand-ink)', tax: 'var(--tax)', taxstrong: 'var(--tax-strong)' };
const C = 2 * Math.PI * 52;

function page(key) {
  const c = DATA.countries[key], ex = EX[key], cur = c.currency;
  const the = (['UK', 'US', 'NL'].includes(key) ? 'the ' : '');
  const N = the + c.name; // country name with article for prose
  const regName = ex.region && DATA.regionTable[key] && DATA.regionTable[key][ex.region] ? DATA.regionTable[key][ex.region].name : '';
  const r = ENGINE.compute({ countryKey: key, gross: ex.salary, filingStatus: 'single', region: ex.region, spend: buildSpend(ex.salary) });
  const deep = ex.region ? `../../index.html#c=${key}&s=${ex.region}` : `../../index.html#c=${key}`;

  const rows = r.types.map((t) =>
    `<div class="row"><div class="lhs"><span class="tick" style="background:${TONE[t.tone]}"></span>` +
    `<span class="name">${esc(t.name)}</span></div>` +
    `<div class="amt tnum">${money(t.amount, cur)}<span class="of">${pct(t.amount / r.gross)} of income</span></div></div>`
  ).join('');

  const cmp = ex.cmp.map((k) => {
    if (DATA.usStates[k]) { // compare to a US state (e.g. Texas)
      const g2 = ENGINE.convert(ex.salary, cur.code, 'USD');
      const d = ENGINE.directTaxFor('US', g2, { status: 'single', region: k });
      return `the USA (${DATA.usStates[k].name}) would tax the same pay at about <b>${pct(d.total / g2, 0)}</b> in direct tax`;
    }
    const oc = DATA.countries[k];
    const g2 = ENGINE.convert(ex.salary, cur.code, oc.currency.code);
    const d = ENGINE.directTaxFor(k, g2, { status: 'single' });
    return `${oc.name} would tax it at about <b>${pct(d.total / g2, 0)}</b>`;
  });

  const off = (C - Math.min(r.effRate, 1) * C).toFixed(1);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const tfd = `${r.taxFreedomDay.getDate()} ${months[r.taxFreedomDay.getMonth()]}`;

  const answer = `On a ${money(ex.salary, cur)} salary in ${N}${regName ? ` (${regName})` : ''}, about ` +
    `<b>${money(r.direct.total, cur)}</b> is taken directly as ${c.incomeName.toLowerCase()}${c.socialName ? ' and ' + c.socialName.toLowerCase() : ''} — roughly <b>${pct(r.directRate, 0)}</b>. ` +
    `But once you add the ${c.consumptionName} and fuel duty hidden in everyday spending (about ${money(r.hidden, cur)} a year), your <b>real effective tax rate is around ${pct(r.effRate, 0)}</b>.`;

  const faq = [
    [`How much tax do you really pay in ${N}?`,
      `On ${money(ex.salary, cur)} a year, an estimated ${pct(r.effRate, 0)} of your income becomes tax in ${N} once you count ${money(r.hidden, cur)} of ${c.consumptionName} and fuel duty on top of the ${money(r.direct.total, cur)} taken directly. Your exact figure depends on your deductions and spending.`],
    [`What is the difference between my payslip tax rate and my real tax rate?`,
      `Your payslip shows the direct rate — about ${pct(r.directRate, 0)} here (${c.incomeName.toLowerCase()}${c.socialName ? ' plus ' + c.socialName.toLowerCase() : ''}). Your real rate also includes the ${c.consumptionName} and fuel duty you pay whenever you spend, which most people never add up. On this salary that is roughly ${money(r.hidden, cur)} more a year.`],
    [c.tips[0][0] + ` — does it help in ${N}?`, c.tips[0][1]]
  ];
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

  const title = `How much tax do you really pay in ${N}? (2026)`;
  const desc = `On ${money(ex.salary, cur)} in ${N}, your real effective tax rate is about ${pct(r.effRate, 0)} once VAT/sales tax and fuel duty are added to income tax. Free 2026 calculator.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/country/${ex.slug}/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/country/${ex.slug}/">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../icons/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../../styles.css">
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Tax.cal', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE}/country/${ex.slug}/` }] })}</script>
</head>
<body>
<script>try{var t=localStorage.getItem('taxcal_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<header class="site-head"><div class="wrap">
  <a class="brand" href="../../index.html" style="text-decoration:none">
    <svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#0694A2"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="15" fill="url(#bg)"/><g fill="none" stroke-width="7.4" stroke-linecap="round"><circle cx="32" cy="32" r="15.5" stroke="#fff"/><path d="M32 16.5 A15.5 15.5 0 0 1 45.4 40.2" stroke="#F59E0B"/></g></svg>
    Tax<span class="dot">.cal</span></a>
  <span class="head-spacer"></span>
  <span class="pill"><span class="blip"></span>Estimates</span>
</div></header>

<main>
  <section class="hero wrap">
    <p class="eyebrow">${esc(c.flag + ' ' + c.name)} · 2026</p>
    <h1>How much tax do you <span class="u">really</span> pay in ${esc(N)}?</h1>
    <p class="lede">${answer}</p>
  </section>

  <section class="wrap section">
    <div class="card reveal-card">
      <div class="reveal-top">
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" style="stroke:var(--brand);opacity:.16" stroke-width="14"></circle>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#tg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off}"></circle>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F59E0B"></stop><stop offset="1" stop-color="#F97316"></stop></linearGradient></defs>
          </svg>
          <div class="ring-center"><div class="pct">${pct(r.effRate, 0)}</div><div class="cap">real tax rate</div></div>
        </div>
        <div class="reveal-head">
          <div class="k">Example · ${money(ex.salary, cur)}/yr in ${esc(N)}${regName ? ' (' + esc(regName) + ')' : ''}</div>
          <div class="big">${money(r.taxTotal, cur)}<span class="cur"> / yr in tax</span></div>
          <div class="sub">You keep about <b>${money(r.netMonthly, cur)}/month</b> after direct deductions.</div>
        </div>
      </div>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">Where it goes</span><h2>The ${money(ex.salary, cur)} breakdown</h2></div></div>
      <div class="rows">${rows}</div>
    </div>

    <div class="card pad" style="margin-top:16px;text-align:center">
      <div class="sec-title" style="justify-content:center"><div><span class="kicker">Your turn</span><h2>See your own real tax rate</h2></div></div>
      <p class="hint" style="margin:-4px 0 16px">Enter your salary and spending — it takes seconds, and nothing is stored.</p>
      <a class="btn" href="${deep}" style="max-width:340px;margin:0 auto;text-decoration:none">Open the calculator
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">In context</span><h2>Is that a lot?</h2></div></div>
      <p style="color:var(--muted);font-size:15px">At an estimated <b style="color:var(--ink)">${pct(r.effRate, 0)}</b> effective rate, you'd work from 1 January until <b style="color:var(--ink)">${tfd}</b> just to cover tax. For comparison, on the equivalent salary ${cmp[0]}; ${cmp[1]}.</p>
    </div>

    <div class="wrap section" style="padding-left:0;padding-right:0">
      <div class="sec-title"><div><span class="kicker">Questions</span><h2>${esc(c.name)} tax, answered</h2></div></div>
      ${faq.map(([q, a]) => `<details class="acc"><summary>${esc(q)}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body"><p>${a}</p></div></details>`).join('\n      ')}
    </div>
  </section>

  <footer class="foot wrap">
    <div class="disc"><strong>Estimates only.</strong> Figures use ${c.taxYear} rates for a single earner and reasonable assumptions about spending; ${esc(c.note || 'they are not personalised tax advice')}. Not tax, financial or legal advice.</div>
    <div class="row2"><a href="../../index.html">← Back to Tax.cal</a><span>·</span><span>© 2026 Tax.cal</span></div>
  </footer>
</main>
</body>
</html>`;
}

DATA.order.forEach((key) => {
  const slug = EX[key].slug;
  mkdirSync(new URL(`./country/${slug}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`./country/${slug}/index.html`, import.meta.url), page(key));
  console.log('wrote country/' + slug + '/index.html');
});
