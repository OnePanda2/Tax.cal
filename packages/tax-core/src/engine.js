/* ============================================================================
   Tax.cal engine — composes the per-country calculators into results.

   compute(input)      the website's result object (shape kept compatible with
                       the v18 UI, plus metadata the UI can use)
   runDirect(...)      direct taxes for one person, with per-component confidence
   indirectEstimate()  tax inside spending, category by category
   All pure: no I/O, no clock, no randomness.
   ========================================================================== */
import { COUNTRIES, ORDER, US_STATES, CA_PROVINCES, SAVINGS_CAP } from './countries.js';
import { CATEGORIES } from './categories.js';
import { convert } from './fx.js';

export const ENGINE_VERSION = '2.0.0';

export function getEntry(key) {
  const e = COUNTRIES[key];
  if (!e) throw new Error('Unsupported country: ' + key);
  return e;
}

export function getRules(key, year) {
  const e = getEntry(key);
  const y = year || e.defaultYear;
  const R = e.rules[y];
  if (!R) throw new Error('Unsupported tax year ' + y + ' for ' + key);
  return R;
}

/* Normalise a region against the country's table: unknown keys fall back to
   the country's default (used by the website, never by the API, which
   rejects unknown regions instead). */
export function resolveRegion(key, region) {
  const e = getEntry(key);
  if (!e.profile.regionType) return null;
  const tbl = e.regions || {};
  if (tbl[region]) return region;
  return e.profile.regionDefault || Object.keys(tbl)[0] || null;
}

const LEVEL = { high: 3, medium: 2, low: 1 };
export function minConfidence(...levels) {
  const ok = levels.filter((l) => LEVEL[l]);
  if (!ok.length) return 'not_applicable';
  return ok.reduce((a, b) => (LEVEL[a] <= LEVEL[b] ? a : b));
}

/* Direct taxes for one person. opts: {status, region, regime, residency,
   ageBand, deductions, childless}. Returns the calculator output plus the
   web grouping {income, social, state, total} and the confidence map. */
export function runDirect(key, gross, opts = {}, year) {
  const e = getEntry(key);
  const R = getRules(key, year);
  const y = Math.max(0, Number(gross) || 0);
  const res = e.calc(R, { ...opts, gross: y });
  const confidence = { ...R.confidence, ...(res.confidence || {}) };
  // Website grouping: the US shows state income tax on its own line; every
  // other country folds sub-national income tax into "income tax".
  const separateState = key === 'US';
  const direct = {
    income: res.incomeTax + (separateState ? 0 : res.regional),
    social: res.social,
    state: separateState ? res.regional : 0,
    total: res.incomeTax + res.social + res.regional
  };
  return { key, year: R.taxYear, rules: R, calc: res, direct, confidence };
}

/* Legacy helper used by build scripts and the comparison bars. */
export function directTaxFor(key, y, opts, year) {
  return runDirect(key, y, opts || {}, year).direct;
}

/* Effective tax as a fraction of tax-inclusive spending in one category. */
export function categoryRate(key, R, catId, region) {
  const cat = R.indirectTax.categories[catId];
  if (!cat) return { rate: 0, confidence: 'low', reason: '', nominalRate: null };
  if (R.indirectTax.model === 'regional-sales-tax' && cat.effectiveRate == null) {
    const tbl = getEntry(key).regions || {};
    const r = (tbl[region] ? tbl[region].sales : 0) / 100;
    return { rate: (r / (1 + r)) * cat.taxableShare, confidence: cat.confidence, reason: cat.reason, nominalRate: r };
  }
  return { rate: cat.effectiveRate, confidence: cat.confidence, reason: cat.reason, nominalRate: cat.nominalRate ?? null };
}

/* Indirect tax hidden in monthly spending (local currency per month). */
export function indirectEstimate(key, R, spend, region) {
  let total = 0, consumption = 0, fuel = 0;
  const byCat = CATEGORIES.map((cat) => {
    const monthly = Math.max(0, Number(spend && spend[cat.id]) || 0);
    const cr = categoryRate(key, R, cat.id, region);
    const annual = monthly * cr.rate * 12;
    total += annual;
    if (cat.id === 'fuel') fuel += annual; else consumption += annual;
    return { id: cat.id, label: cat.label, emoji: cat.emoji, monthly, fraction: cr.rate, annual, conf: cr.confidence, reason: cr.reason, nominalRate: cr.nominalRate };
  });
  return { total, consumption, fuel, byCat };
}

/* Marginal direct-tax rate measured over the next 1,000 units of income. */
export function marginalRate(key, y, opts, year) {
  const step = 1000;
  const d0 = runDirect(key, y, opts, year).direct.total;
  const d1 = runDirect(key, y + step, opts, year).direct.total;
  return Math.min(0.62, Math.max(0, (d1 - d0) / step));
}

/* "You could keep up to" — an ILLUSTRATIVE ceiling, not a personal finding:
   marginal rate × the country's main tax-advantaged contribution limit, with
   a modest floor. India returns null: under the default new regime almost no
   deductions exist, so the heuristic would mislead; the regime comparison is
   shown instead. */
export function illustrativeSavingsCeiling(key, y, opts, year) {
  if (!(key in SAVINGS_CAP)) return null;
  if (y <= 0) return { low: 0, high: 0, monthly: 0, marginalRate: 0 };
  const mr = marginalRate(key, y, opts, year);
  const cap = SAVINGS_CAP[key];
  const round10 = (x) => Math.round(x / 10) * 10;
  const high = round10(Math.max(Math.min(y * 0.15, cap) * mr, y * 0.02));
  let low = round10(Math.min(Math.min(y * 0.06, cap) * mr, y * 0.008));
  if (low >= high) low = round10(high * 0.5);
  return { low, high, monthly: high / 12, marginalRate: mr, illustrative: true };
}
export const estimateSavings = illustrativeSavingsCeiling;

/* Representative region used for "other country" comparison bars. */
export function repRegion(k) { return k === 'CA' ? 'ON' : null; }

const CONF_UI = { high: 'high', medium: 'med', low: 'low', not_applicable: 'high' };

/* The website's result object. */
export function compute(input) {
  const key = input.countryKey;
  const e = getEntry(key);
  const year = input.taxYear && e.rules[input.taxYear] ? input.taxYear : e.defaultYear;
  const R = e.rules[year];
  const c = e.profile;
  const y = Math.max(0, Number(input.gross) || 0);
  const status = input.filingStatus || 'single';
  const region = resolveRegion(key, input.region);
  const opts = {
    status, region,
    regime: input.regime, residency: input.residency, ageBand: input.ageBand,
    deductions: input.deductions, childless: input.childless
  };

  const run = runDirect(key, y, opts, year);
  const direct = run.direct;
  const ind = indirectEstimate(key, R, input.spend, region);

  const taxTotal = direct.total + ind.total;
  const effRate = y > 0 ? taxTotal / y : 0;
  const directRate = y > 0 ? direct.total / y : 0;
  const netAnnual = y - direct.total;

  const conf = run.confidence;
  const types = [];
  const incomeConf = key === 'US' ? conf.direct_tax : minConfidence(conf.direct_tax, conf.regional_tax);
  types.push({ key: 'income', name: c.incomeName, amount: direct.income, tone: 'brand', conf: CONF_UI[incomeConf] });
  if (c.socialName) {
    const socialName = key === 'US' && region === 'CA' ? 'Social Security, Medicare + CA SDI' : c.socialName;
    types.push({ key: 'social', name: socialName, amount: direct.social, tone: 'brand2', conf: CONF_UI[conf.social_contributions] });
  }
  if (key === 'US') types.push({ key: 'state', name: 'State income tax (' + region + ')', amount: direct.state, tone: 'brandink', conf: CONF_UI[conf.regional_tax] });
  types.push({ key: 'vat', name: c.consumptionName + ' on spending', amount: ind.consumption, tone: 'tax', conf: 'med' });
  types.push({ key: 'fuel', name: 'Fuel taxes', amount: ind.fuel, tone: 'taxstrong', conf: 'med' });
  const typesFiltered = types.filter((t) => t.amount > 0.5);

  // Cross-country comparison: direct tax on the same salary, converted at
  // approximate exchange rates. Not a cost-of-living comparison.
  const comparison = ORDER.map((k) => {
    const oc = getEntry(k).profile;
    if (k === key) return { key: k, name: c.name + (region ? ' · ' + region : ''), flag: c.flag, rate: directRate, isMe: true };
    const g = convert(y, c.currency.code, oc.currency.code);
    const rr = repRegion(k);
    const d = directTaxFor(k, g, { status: 'single', region: rr });
    return { key: k, name: oc.name + (k === 'US' ? ' · fed.' : rr ? ' · ' + rr : ''), flag: oc.flag, rate: g > 0 ? d.total / g : 0, isMe: false };
  });

  // Tax Freedom Day: share of the calendar year that covers the total rate.
  const days = Math.round(Math.min(effRate, 0.999) * 365);
  const tfd = new Date(R.calendarYear, 0, 1);
  tfd.setDate(tfd.getDate() + days);

  const out = {
    countryKey: key, country: legacyCountry(key), currency: c.currency,
    taxYear: year, taxYearLabel: R.taxYearLabel, ruleVersion: R.ruleVersion, lastVerified: R.lastVerified,
    gross: y, status, region,
    direct, indirect: ind,
    taxTotal, effRate, directRate,
    netAnnual, netMonthly: netAnnual / 12,
    visible: direct.total, hidden: ind.total,
    savings: illustrativeSavingsCeiling(key, y, opts, year),
    types: typesFiltered, comparison, taxFreedomDay: tfd,
    lines: run.calc.lines, notes: run.calc.notes, confidence: conf
  };
  if (key === 'IN') out.india = indiaSummary(run.calc.details, y);
  return out;
}

function indiaSummary(details, gross) {
  const pick = (t) => ({ regime: t.regime, taxable: t.taxable, tax: t.total, rebate: t.rebate, surcharge: t.surcharge, cess: t.cess, deductions: t.deductions.total, monthly: t.total / 12, effRate: gross > 0 ? t.total / gross : 0 });
  const nw = details.chosen.regime === 'new' ? details.chosen : details.other;
  const old = details.chosen.regime === 'old' ? details.chosen : details.other;
  return { regime: details.regime, new: pick(nw), old: pick(old), oldMinusNew: old.total - nw.total };
}

/* ---- legacy browser data shape (window.TAXCAL_DATA) ---------------------- */
const legacyCache = {};
export function legacyCountry(key) {
  if (legacyCache[key]) return legacyCache[key];
  const e = getEntry(key);
  const p = e.profile;
  const R = e.rules[e.defaultYear];
  const cats = R.indirectTax.categories;
  const out = {
    name: p.name, flag: p.flag, slug: p.slug, article: p.article, taxYear: displayYear(R),
    currency: p.currency, incomeName: p.incomeName, socialName: p.socialName,
    consumptionName: p.consumptionName, vatStandard: R.indirectTax.standardRate ?? null,
    regionType: p.regionType, regionLabel: p.regionLabel, regionDefault: p.regionDefault,
    note: p.note, tips: p.tips,
    cat: {}, catConf: {}, catReason: {}
  };
  for (const id of Object.keys(cats)) {
    out.cat[id] = cats[id].effectiveRate ?? null;
    out.catConf[id] = cats[id].confidence;
    out.catReason[id] = cats[id].reason;
  }
  if (R.indirectTax.model === 'regional-sales-tax') {
    out.catShare = {};
    for (const id of Object.keys(cats)) out.catShare[id] = cats[id].taxableShare ?? null;
    out.fuelFraction = cats.fuel.effectiveRate;
  }
  legacyCache[key] = out;
  return out;
}

export function displayYear(R) {
  return R.country === 'UK' ? '2026/27' : R.taxYear;
}

export { ORDER, COUNTRIES, US_STATES, CA_PROVINCES, SAVINGS_CAP };
