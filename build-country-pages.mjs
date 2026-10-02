/* Generate one SEO landing page per country ("one page for one search").
 * Each page answers "how much tax do you really pay in <country>", with real
 * numbers from the shared engine, FAQ schema, and a deep-link into the
 * calculator. India gets an extra regime table at common salaries, because
 * "tax on 15 lakh salary" and "old vs new regime" are the questions people ask.
 * Run:  node build-country-pages.mjs   →   country/<slug>/index.html
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  compute, convert, directTaxFor, ORDER, getEntry, getRules, defaultSpending, US_STATES,
  regimeFromSalary, breakevenDeductions
} from './packages/tax-core/src/index.js';

const SITE = 'https://taxcal.siddheshthapa.com';

// representative example per country: salary, optional region, comparisons
// (a US state is written st:XX so it can never be confused with a country key)
const EX = {
  UK: { salary: 40000, cmp: ['DE', 'US'] },
  US: { salary: 75000, region: 'CA', cmp: ['UK', 'st:TX'] },
  CA: { salary: 75000, region: 'ON', cmp: ['US', 'UK'] },
  AU: { salary: 90000, cmp: ['UK', 'DE'] },
  IE: { salary: 50000, cmp: ['UK', 'NL'] },
  DE: { salary: 55000, cmp: ['UK', 'NL'] },
  FR: { salary: 45000, cmp: ['DE', 'IE'] },
  NL: { salary: 50000, cmp: ['DE', 'IE'] },
  ES: { salary: 40000, cmp: ['FR', 'IT'] },
  IT: { salary: 35000, cmp: ['ES', 'FR'] },
  IN: { salary: 1500000, cmp: ['UK', 'US'] }
};
for (const k of ORDER) if (!EX[k]) throw new Error('No country-page example for ' + k);

function money(n, cur) {
  return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(Math.round(n));
}
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lakh = (n) => (n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' lakh';

const TONE = { brand: 'var(--brand)', brand2: 'var(--brand-2)', brandink: 'var(--brand-ink)', tax: 'var(--tax)', taxstrong: 'var(--tax-strong)' };
const C = 2 * Math.PI * 52;
const CONF_LABEL = { high: 'known rate', med: 'estimate', low: 'rough' };

/* India: new vs old regime at common salaries (resident, below 60). */
function indiaTable(R, cur) {
  const salaries = [600000, 800000, 1000000, 1200000, 1275000, 1500000, 1800000, 2000000, 2500000, 3000000, 5000000];
  const rows = salaries.map((s) => {
    const base = { gross: s, residency: 'resident', ageBand: 'below_60' };
    const nw = regimeFromSalary(R, 'new', base);
    const old0 = regimeFromSalary(R, 'old', base);
    const old375 = regimeFromSalary(R, 'old', { ...base, deductions: { section_80c: 150000, section_80d: 25000, home_loan_interest: 200000 } });
    const be = breakevenDeductions(R, base);
    return `<tr><td class="tnum">₹${esc(lakh(s))}</td><td class="tnum"><b>${money(nw.total, cur)}</b></td><td class="tnum">${money(old0.total, cur)}</td><td class="tnum">${money(old375.total, cur)}</td><td class="tnum">${be === 0 ? '—' : be == null ? 'n/a' : '₹' + esc(lakh(be))}</td></tr>`;
  }).join('\n          ');
  return `
    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">Tax Year 2026-27</span><h2>Income tax on common salaries</h2></div></div>
      <div class="scroll-x">
      <table class="gtable">
        <thead><tr><th>Salary</th><th>New regime</th><th>Old regime, no deductions</th><th>Old regime, ₹3.75 lakh deductions</th><th>Old regime breaks even at</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      </div>
      <p class="hint" style="margin-top:12px">Resident individual below 60, salary only. Tax includes the rebate, surcharge where it applies and the 4% Health and Education Cess. "₹3.75 lakh deductions" means 80C ₹1.5 lakh + 80D ₹25,000 + home-loan interest ₹2 lakh. The last column is the total of old-regime deductions and exemptions at which the old regime would cost the same as the new one.</p>
    </div>`;
}

function indiaFaq(r, R) {
  const cur = r.currency;
  const nw = r.india.new, old = r.india.old;
  return [
    ['Is income up to ₹12 lakh tax-free in India?',
      `Under the new regime, a resident individual whose taxable income is up to ₹12 lakh pays no income tax, because the section 156 rebate (up to ₹60,000) cancels it. Salaried employees also get the ₹75,000 standard deduction, so a salary of up to ₹12.75 lakh pays nothing. Just above that line, marginal relief stops the tax from jumping: the tax can never exceed the income above ₹12 lakh. The rebate is not available to non-residents.`],
    ['What is "Tax Year 2026-27"?',
      `From 1 April 2026 India's income tax is governed by the Income-tax Act, 2025, which replaces the old "previous year" and "assessment year" pair with a single tax year. Tax Year 2026-27 runs from 1 April 2026 to 31 March 2027. Income earned in FY 2025-26 is still assessed in AY 2026-27 under the Income-tax Act, 1961 — a separate obligation. The 2026-27 slabs, rebate and standard deduction are the same amounts as 2025-26.`],
    [`How much income tax is due on a ${money(r.gross, cur)} salary?`,
      `About ${money(nw.tax, cur)} a year (${money(nw.monthly, cur)} a month) under the new regime, including the 4% cess. Under the old regime with no deductions it would be ${money(old.tax, cur)}. Your own figure depends on your deductions, any other income and your residency.`],
    ['Should I choose the old or the new regime?',
      `Tax.cal cannot choose for you, but it can show the numbers: the old regime only comes out lower if your deductions and exemptions (80C, 80D, HRA, home-loan interest and so on) are large. The table above shows, for common salaries, roughly how much you would need. Salaried people without business income can pick either regime each year when filing.`],
    ['Does Tax.cal include GST and fuel tax?',
      `Yes, as clearly labelled estimates. GST is applied category by category using the two-slab rates in force since 22 September 2025 (staples nil, most packaged food and everyday goods 5%, most services 18%), and petrol taxes use the official Delhi price build-up (central excise plus VAT, about 28% of the pump price in October 2026). Electricity duty, state professional tax and EPF are left out.`]
  ];
}

function page(key) {
  const e = getEntry(key);
  const c = e.profile, ex = EX[key], cur = c.currency;
  const R = getRules(key);
  const N = (c.article ? c.article + ' ' : '') + c.name;
  const regName = ex.region && e.regions && e.regions[ex.region] ? e.regions[ex.region].name : '';
  const r = compute({ countryKey: key, gross: ex.salary, filingStatus: 'single', region: ex.region, spend: defaultSpending(ex.salary) });
  const deep = ex.region ? `../../index.html#c=${key}&s=${ex.region}` : `../../index.html#c=${key}`;

  const rows = r.types.map((t) =>
    `<div class="row"><div class="lhs"><span class="tick" style="background:${TONE[t.tone]}"></span>` +
    `<span><div class="name">${esc(t.name)}</div><div class="meta"><span class="conf ${t.conf}">${CONF_LABEL[t.conf] || 'estimate'}</span></div></span></div>` +
    `<div class="amt tnum">${money(t.amount, cur)}<span class="of">${pct(t.amount / r.gross)} of income</span></div></div>`
  ).join('');

  const cmp = ex.cmp.map((k) => {
    if (k.indexOf('st:') === 0) {
      k = k.slice(3);
      if (!US_STATES[k]) throw new Error('Unknown US state in cmp: ' + k);
      const g2 = convert(ex.salary, cur.code, 'USD');
      const d = directTaxFor('US', g2, { status: 'single', region: k });
      return `the USA (${US_STATES[k].name}) would tax the same pay at about <b>${pct(d.total / g2, 0)}</b> in direct tax`;
    }
    const oc = getEntry(k).profile;
    const g2 = convert(ex.salary, cur.code, oc.currency.code);
    const d = directTaxFor(k, g2, { status: 'single', region: k === 'CA' ? 'ON' : null });
    return `${oc.name}${k === 'US' ? ' (federal + FICA, before any state tax)' : ''} would tax it at about <b>${pct(d.total / g2, 0)}</b>`;
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
    ...(key === 'IN' ? indiaFaq(r, R) : [[c.tips[0][0] + ` — does it help in ${N}?`, c.tips[0][1]]])
  ];
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) };

  const isIN = key === 'IN';
  const title = isIN
    ? 'Income tax calculator India 2026-27: new vs old regime, and the tax you really pay'
    : `How much tax do you really pay in ${N}? (2026)`;
  const desc = isIN
    ? `Tax Year 2026-27 (Income-tax Act, 2025): tax on a ₹15 lakh salary is ${money(r.india.new.tax, cur)} under the new regime. Compare old vs new regime at common salaries, see the ₹12 lakh rebate, and the GST and fuel tax you also pay.`
    : `On ${money(ex.salary, cur)} in ${N}, your real effective tax rate is about ${pct(r.effRate, 0)} once VAT/sales tax and fuel duty are added to income tax. Free 2026 calculator.`;
  const eyebrow = isIN ? `${c.flag} ${c.name} · Tax Year 2026-27` : `${c.flag} ${c.name} · 2026`;
  const h1 = isIN ? `How much tax do you <span class="u">really</span> pay in India?` : `How much tax do you <span class="u">really</span> pay in ${esc(N)}?`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/country/${c.slug}/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/country/${c.slug}/">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../icons/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../../styles.css?v=19">
  <!-- Privacy-friendly analytics by Plausible -->
  <script async src="https://plausible.io/js/pa-Wj_1OavoJ4_-NVQlAh9IK.js"></script>
  <script>
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init()
  </script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Tax.cal', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE}/country/${c.slug}/` }] })}</script>
${isIN ? `<style>
  .gtable{width:100%;border-collapse:collapse;font-size:14px}
  .gtable th{text-align:left;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 10px 8px 0;border-bottom:1px solid var(--line-strong)}
  .gtable td{padding:10px 10px 10px 0;border-bottom:1px solid var(--line);color:var(--ink)}
  .gtable tr:last-child td{border-bottom:0}
  .gtable .tnum{white-space:nowrap;font-variant-numeric:tabular-nums}
  .scroll-x{overflow-x:auto}
</style>` : ''}</head>
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
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1>${h1}</h1>
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
      <p class="hint" style="margin-top:12px">Rules: ${esc(R.taxYearLabel)} · ${esc(R.ruleVersion)} · last verified ${esc(R.lastVerified)}.</p>
    </div>
${isIN ? indiaTable(R, cur) : ''}
    <div class="card pad" style="margin-top:16px;text-align:center">
      <div class="sec-title" style="justify-content:center"><div><span class="kicker">Your turn</span><h2>See your own real tax rate</h2></div></div>
      <p class="hint" style="margin:-4px 0 16px">Enter your salary and spending${isIN ? ', pick a regime' : ''} — it takes seconds, and nothing is stored.</p>
      <a class="btn" href="${deep}" style="max-width:340px;margin:0 auto;text-decoration:none">Open the calculator
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">In context</span><h2>Is that a lot?</h2></div></div>
      <p style="color:var(--muted);font-size:15px">At an estimated <b style="color:var(--ink)">${pct(r.effRate, 0)}</b> effective rate, you'd work from 1 January until <b style="color:var(--ink)">${tfd}</b> just to cover tax. For comparison, on the equivalent salary converted at approximate exchange rates, ${cmp[0]}; ${cmp[1]}. That is a comparison of tax rules, not of living costs.</p>
    </div>

    <div class="wrap section" style="padding-left:0;padding-right:0">
      <div class="sec-title"><div><span class="kicker">Questions</span><h2>${esc(c.name)} tax, answered</h2></div></div>
      ${faq.map(([q, a]) => `<details class="acc"><summary>${esc(q)}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body"><p>${a}</p></div></details>`).join('\n      ')}
    </div>
  </section>

  <footer class="foot wrap">
    <div class="disc"><strong>Estimates only.</strong> Figures use ${esc(R.taxYearLabel)} rules for a single earner and reasonable assumptions about spending; ${esc((c.note || 'they are not personalised tax advice').replace(/\.$/, ''))}. Not tax, financial or legal advice.</div>
    <div class="row2"><a href="../../index.html">← Back to Tax.cal</a><span>·</span><span><a href="../../privacy/">Privacy</a></span><span>·</span><span>© 2026 Tax.cal</span></div>
  </footer>
</main>
</body>
</html>`;
}

for (const key of ORDER) {
  const slug = getEntry(key).profile.slug;
  mkdirSync(new URL(`./country/${slug}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`./country/${slug}/index.html`, import.meta.url), page(key));
  console.log('wrote country/' + slug + '/index.html');
}
