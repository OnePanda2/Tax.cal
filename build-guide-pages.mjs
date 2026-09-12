/* Generate the explainer/guide pages ("how the number is worked out").
 *
 * Same principle as build-country-pages.mjs: every figure on the page is
 * computed by the LIVE engine at build time, so a published explanation can
 * never drift from what the calculator actually does. Re-run this whenever
 * rates or category assumptions change.
 *
 * Run:  node build-guide-pages.mjs   →   hidden-tax/index.html
 *
 * Currently UK-only: the "why this rate" column is country-specific prose, so a
 * second country means a second REASONS block, not a loop over DATA.order.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const g = { window: {} };
global.window = g.window;
const load = (f) => (0, eval)(readFileSync(new URL('./assets/' + f, import.meta.url), 'utf8'));
load('tax-data.js'); load('tax-engine.js');
const DATA = g.window.TAXCAL_DATA, ENGINE = g.window.TaxEngine;

const SITE = 'https://taxcal.siddheshthapa.com';
const KEY = 'UK';
const SALARY = 45000;

const c = DATA.countries[KEY], cur = c.currency;
const money = (n) => new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(Math.round(n));
const money2 = (n) => new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const noDot = (s) => String(s).replace(/\.\s*$/, ''); // c.note already ends in a full stop

/* spending, as a multiple of the figures the calculator pre-fills */
function spendAt(mult) {
  const s = {};
  DATA.categories.forEach((cat) => { s[cat.id] = Math.round((SALARY / 12 * cat.def * mult) / 10) * 10; });
  return s;
}
const monthlyTotal = (s) => Object.values(s).reduce((a, b) => a + b, 0);
const run = (mult) => ENGINE.compute({ countryKey: KEY, gross: SALARY, filingStatus: 'single', spend: spendAt(mult) });

const r = run(1);
const levels = [1, 1.5, 2].map((m) => ({ spend: monthlyTotal(spendAt(m)), r: run(m) }));

/* Why each category carries the rate it does. These describe Tax.cal's OWN
   assumption — they are not a statement of tax law and must not become one. */
const REASONS = {
  groceries: 'Most food sold in a supermarket is not standard-rated in the UK. This small figure is Tax.cal’s assumption about the rest of a typical trolley — household goods, confectionery, alcohol.',
  dining: 'Standard-rated. On a price that already includes 20% VAT, the tax is one sixth of what you hand over.',
  fuel: 'The largest single assumption on the page: fuel duty, plus VAT charged on top of it. It is a share of the pump price, not a published rate, and pump prices move.',
  shopping: 'Mostly standard-rated, but not all of it — so Tax.cal uses a little under one sixth.',
  utilities: 'Domestic energy is not charged at the standard rate; other bills generally are. This is a blend.',
  entertainment: 'Standard-rated, so the same one sixth as eating out.'
};
const CONF = { high: 'known rate', med: 'estimate', low: 'rough' };

const catRows = DATA.categories.map((cat) => {
  const frac = c.cat[cat.id];
  const conf = c.catConf[cat.id] || 'med';
  return `<tr>
      <td><span class="em">${cat.emoji}</span> ${esc(cat.label)}</td>
      <td class="tnum"><b>${pct(frac)}</b><br><span class="conf ${conf}">${CONF[conf]}</span></td>
      <td class="why">${REASONS[cat.id]}</td>
    </tr>`;
}).join('\n      ');

const levelRows = levels.map((l) => `<tr>
      <td>${money(l.spend)} a month${l.spend === levels[0].spend ? ' <span class="tag">pre-filled</span>' : ''}</td>
      <td class="tnum">${money(l.r.hidden)}</td>
      <td class="tnum"><b>${pct(l.r.effRate, 0)}</b></td>
    </tr>`).join('\n      ');

const directRows = r.types.filter((t) => t.key === 'income' || t.key === 'social').map((t) =>
  `<div class="row"><div class="lhs"><span class="tick" style="background:var(--brand)"></span><span class="name">${esc(t.name)}</span></div>` +
  `<div class="amt tnum">${money(t.amount)}<span class="of">${pct(t.amount / r.gross)} of income</span></div></div>`
).join('');

const indirectRows = r.types.filter((t) => t.key === 'vat' || t.key === 'fuel').map((t) =>
  `<div class="row"><div class="lhs"><span class="tick" style="background:var(--tax)"></span><span class="name">${esc(t.name)}</span></div>` +
  `<div class="amt tnum">${money(t.amount)}<span class="of">${pct(t.amount / r.gross)} of income</span></div></div>`
).join('');

const title = 'The tax that isn’t on your payslip — how Tax.cal adds it up (2026)';
const desc = `Your payslip shows ${money(r.direct.total)} on a ${money(SALARY)} UK salary. Tax.cal estimates another ${money(r.hidden)} in VAT and fuel duty. Here is exactly how that second number is worked out — and what it leaves out.`;

const faq = [
  ['Why does Tax.cal use 16.7% for VAT and not 20%?',
    'Because VAT is added to a price. A £10 meal that already includes 20% VAT is £8.33 plus £1.67 of tax, so the tax is one sixth of what you hand over rather than a fifth. Tax.cal asks what you spend, not what things cost before tax, so it uses the sixth.'],
  ['How accurate is the hidden-tax figure?',
    `It is an estimate and is labelled as one. The direct half — income tax and National Insurance — is computed from published ${c.taxYear} bands and is precise for a single earner. The indirect half applies one effective rate to a whole spending category, because a real shop mixes items taxed differently. Each category carries a confidence label in the calculator.`],
  ['What taxes are left out of the number?',
    'Council tax, alcohol and tobacco duties, insurance premium tax, air passenger duty, vehicle excise duty, stamp duty and employer’s National Insurance are all real and none of them is counted. Student loan repayments are not counted either, because they are not a tax. The figure Tax.cal shows is therefore a floor, not a ceiling.']
];
const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/hidden-tax/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/hidden-tax/">
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
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Tax.cal', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'The tax that isn’t on your payslip', item: SITE + '/hidden-tax/' }] })}</script>
<style>
  .guide p{color:var(--muted);font-size:15.5px;line-height:1.65;margin:0 0 14px}
  .guide p b,.guide p strong{color:var(--ink)}
  .guide h2{margin:0 0 4px}
  .gtable{width:100%;border-collapse:collapse;font-size:14.5px}
  .gtable th{text-align:left;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:0 10px 8px 0;border-bottom:1px solid var(--line-strong)}
  .gtable td{padding:12px 10px 12px 0;border-bottom:1px solid var(--line);vertical-align:top;color:var(--ink)}
  .gtable tr:last-child td{border-bottom:0}
  .gtable .why{color:var(--muted);line-height:1.55}
  .gtable .em{margin-right:6px}
  .gtable .tnum{white-space:nowrap}
  .gtable .conf{display:inline-block;margin-top:5px}
  .tag{display:inline-block;font-size:11px;color:var(--muted);border:1px solid var(--line-strong);border-radius:999px;padding:1px 7px;margin-left:4px;vertical-align:1px}
  .scroll-x{overflow-x:auto}
  @media (max-width:560px){.gtable .why{display:none}}
</style>
</head>
<body>
<script>try{var t=localStorage.getItem('taxcal_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
<header class="site-head"><div class="wrap">
  <a class="brand" href="../index.html" style="text-decoration:none">
    <svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#0694A2"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="15" fill="url(#bg)"/><g fill="none" stroke-width="7.4" stroke-linecap="round"><circle cx="32" cy="32" r="15.5" stroke="#fff"/><path d="M32 16.5 A15.5 15.5 0 0 1 45.4 40.2" stroke="#F59E0B"/></g></svg>
    Tax<span class="dot">.cal</span></a>
  <span class="head-spacer"></span>
  <span class="pill"><span class="blip"></span>Estimates</span>
</div></header>

<main class="guide">
  <section class="hero wrap">
    <p class="eyebrow">🇬🇧 United Kingdom · ${esc(c.taxYear)}</p>
    <h1>The tax that isn’t on your <span class="u">payslip</span></h1>
    <p class="lede">On a ${money(SALARY)} salary, ${money(r.direct.total)} is taken before the money reaches you — about <b>${pct(r.directRate, 0)}</b>. Then you spend what’s left, and more tax comes out of it: an estimated <b>${money(r.hidden)}</b> a year in VAT and fuel duty, which takes the real share of your income to about <b>${pct(r.effRate, 0)}</b>. This page shows exactly how that second number is worked out, and what it leaves out.</p>
  </section>

  <section class="wrap section">

    <div class="card pad">
      <div class="sec-title"><div><span class="kicker">Step one</span><h2>The half you can see</h2></div></div>
      <p>This part is not estimated. Income tax and National Insurance are computed from the published ${esc(c.taxYear)} bands, for a single earner, the same way a payslip does it.</p>
      <div class="rows">${directRows}</div>
      <p style="margin:14px 0 0">${esc(c.note)}</p>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">Step two</span><h2>The half you can’t</h2></div></div>
      <p>VAT never appears on a payslip, because it is charged when you spend rather than when you earn. HMRC publishes a standard rate of 20%, with reduced and zero rates for some things — which is why the six numbers below are all different. Tax.cal asks what you spend each month in six categories and applies one effective rate to each.</p>
      <div class="scroll-x">
      <table class="gtable">
        <thead><tr><th>Category</th><th>Tax.cal assumes</th><th>Why</th></tr></thead>
        <tbody>
      ${catRows}
        </tbody>
      </table>
      </div>
      <p style="margin-top:16px">Applied to the spending the calculator pre-fills at this salary, that comes to:</p>
      <div class="rows">${indirectRows}</div>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">The bit people query</span><h2>Why one sixth, not a fifth</h2></div></div>
      <p>A ${money(10)} meal that already includes 20% VAT is ${money2(10 / 1.2)} of food and ${money2(10 - 10 / 1.2)} of tax. The tax is <b>a sixth of what you hand over</b>, not a fifth of it — a fifth would be the answer if you knew the price before VAT was added, and you almost never do. Tax.cal asks what you actually spend, so it uses the sixth: ${pct(1 / 6, 1)}.</p>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">It moves</span><h2>The number depends on what you spend</h2></div></div>
      <p>Direct tax is fixed by your salary. Hidden tax is not — it scales with how much of your take-home actually gets spent on taxed things. At ${money(SALARY)}, on the same ${money(r.direct.total)} of direct tax:</p>
      <div class="scroll-x">
      <table class="gtable">
        <thead><tr><th>Spending across the six categories</th><th>Hidden tax a year</th><th>Real rate</th></tr></thead>
        <tbody>
      ${levelRows}
        </tbody>
      </table>
      </div>
      <p style="margin-top:16px">Rent, mortgage payments and council tax are not in the list, so this is not a question of spending your whole take-home. They are left out because rent and mortgage interest do not carry VAT, and council tax is not charged on what you buy.</p>
      <p style="margin-bottom:0"><b>Which is the point of typing your own figures in.</b> The pre-filled numbers are a plausible household, not yours.</p>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">Honesty</span><h2>What the number leaves out</h2></div></div>
      <p>All of these are real, and none of them is counted: council tax, alcohol and tobacco duties, insurance premium tax, air passenger duty, vehicle excise duty, stamp duty, and employer’s National Insurance — which is paid on top of your salary and never shows up anywhere you can see it. Business taxes that end up inside the prices you pay are not counted either, because there is no honest way to attribute them to one person.</p>
      <p>Student loan repayments are also left out, on the grounds that they are a debt repayment rather than a tax, even though they come out of the same payslip.</p>
      <p style="margin-bottom:0">The direction of all of that is one way: <b>the real figure is higher than the one Tax.cal shows</b>, not lower. Where something cannot be estimated honestly, it is left out rather than guessed at.</p>
    </div>

    <div class="card pad" style="margin-top:16px">
      <div class="sec-title"><div><span class="kicker">How much to trust it</span><h2>Two kinds of number</h2></div></div>
      <p><b>The direct half is precise.</b> Real published ${esc(c.taxYear)} brackets and thresholds, checked against known take-home figures.</p>
      <p><b>The indirect half is an estimate, and says so.</b> One effective rate stands in for a whole category, because a real weekly shop mixes things taxed at different rates and Tax.cal has not seen your receipts. Every category carries a <em>known rate</em>, <em>estimate</em> or <em>rough</em> label in the calculator so you can see which parts are doing the guessing.</p>
      <p style="margin-bottom:0">It does not know your pension contributions, salary sacrifice, other income, or anything you already claim. It is an educational estimate of a total, not a personal tax position — and not tax advice.</p>
    </div>

    <div class="card pad" style="margin-top:16px;text-align:center">
      <div class="sec-title" style="justify-content:center"><div><span class="kicker">Your turn</span><h2>Run it on your own numbers</h2></div></div>
      <p class="hint" style="margin:-4px 0 16px">Takes about twenty seconds. Nothing you type leaves your device.</p>
      <a class="btn" href="${SITE}/#c=UK" style="max-width:340px;margin:0 auto;text-decoration:none">Open the calculator
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <p class="hint" style="margin:16px 0 0">The same method runs for ten countries — <a href="../country/uk/">see the UK summary</a>, or pick another from the calculator.</p>
        <p class="hint" style="margin:8px 0 0">Or see the same method applied across all ten: <a href="../tax-by-country/">which country taxes you most</a>.</p>
        <p class="site-url">or go straight to <a href="${SITE}/">taxcal.siddheshthapa.com</a></p>
    </div>

    <div class="wrap section" style="padding-left:0;padding-right:0">
      <div class="sec-title"><div><span class="kicker">Questions</span><h2>Asked and answered</h2></div></div>
      ${faq.map(([q, a]) => `<details class="acc"><summary>${esc(q)}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary><div class="body"><p>${a}</p></div></details>`).join('\n      ')}
    </div>
  </section>

  <footer class="foot wrap">
    <div class="disc"><strong>Estimates only.</strong> Figures use ${esc(c.taxYear)} rates for a single earner and reasonable assumptions about spending; ${esc(noDot(c.note))}. Not tax, financial or legal advice.</div>
    <div class="row2"><a href="../index.html">← Back to Tax.cal</a><span>·</span><span><a href="../privacy/">Privacy</a></span><span>·</span><span>© 2026 Tax.cal</span></div>
  </footer>
</main>
</body>
</html>`;

mkdirSync(new URL('./hidden-tax/', import.meta.url), { recursive: true });
writeFileSync(new URL('./hidden-tax/index.html', import.meta.url), html);
console.log('wrote hidden-tax/index.html');
