/* ============================================================================
   Tax.cal API layer — the four operations exposed to ChatGPT through MCP (and
   to any future API). Arguments are snake_case JSON, validated strictly;
   results are plain JSON with per-component confidence, sources, assumptions
   and rule versions, so the model explains numbers instead of making them.

   Every function returns { ok: true, result } or { ok: false, error }.
   ========================================================================== */
import { COUNTRIES, ORDER } from './countries.js';
import { CATEGORIES, defaultSpending } from './categories.js';
import { FX, convert } from './fx.js';
import { ENGINE_VERSION, runDirect, indirectEstimate, getRules, minConfidence } from './engine.js';
import { regimeFromSalary, breakevenDeductions } from './calc/in.js';
import { groupIN } from './util.js';
import * as V from './validate.js';

export const SITE = 'https://taxcal.siddheshthapa.com';
const UTM = 'utm_source=chatgpt&utm_medium=plugin';
const DISCLAIMER = 'Estimate for information only — not tax, legal or financial advice. Tax.cal does not file returns or make payments. Check important decisions with the tax authority or a qualified professional.';

// Rounded for output; `|| 0` turns -0 into 0 so JSON text and objects agree.
const r2 = (x) => Math.round(x * 100) / 100 || 0;
const r4 = (x) => Math.round(x * 10000) / 10000 || 0;

/* JSON-safe copy of rule data: Infinity (open-ended bands) becomes null. */
function jsonify(v) {
  if (v === Infinity) return null;
  if (Array.isArray(v)) return v.map(jsonify);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = jsonify(v[k]);
    return out;
  }
  return v;
}

function wrap(fn) {
  return (args) => {
    try {
      return { ok: true, result: fn(args === undefined ? {} : args) };
    } catch (err) {
      if (err instanceof V.InputError) return { ok: false, error: err.toJSON() };
      return { ok: false, error: { code: 'internal_error', message: 'The calculation could not be completed. No data was stored.' } };
    }
  };
}

function learnMore(key, region) {
  const hash = 'c=' + key + (region && /^[A-Z]{2}$/.test(region) ? '&s=' + region : '');
  return { label: 'Explore the full interactive calculator on Tax.cal', url: `${SITE}/?${UTM}#${hash}` };
}

/* "India Tax Year 2026-27", "India FY 2025-26 (AY 2026-27)", "Germany 2026" */
function scopeLabel(key, R) {
  const name = COUNTRIES[key].profile.name;
  if (key !== 'IN') return `${name} ${R.taxYear}`;
  return R.status === 'legacy' ? `India FY ${R.taxYear} (AY ${ayFor(R.taxYear)})` : `India Tax Year ${R.taxYear}`;
}
const ayFor = (fy) => { const a = Number(fy.slice(0, 4)) + 1; return `${a}-${String(a + 1).slice(2)}`; };

function sourcesOut(R) {
  return R.sources.map((s) => ({ title: s.title, publisher: s.publisher, url: s.url, covers: s.covers }));
}

const COMMON_CALC_FIELDS = ['country', 'tax_year', 'gross_income', 'income_type', 'filing_status', 'region', 'monthly_spending', 'include_indirect_estimate', 'regime', 'residency', 'age_band', 'old_regime_deductions', 'has_children'];

/* ---- shared argument parsing for India ---------------------------------- */
function indiaArgs(args, defaults, { comparison = false } = {}) {
  let regime = 'new';
  if (!comparison) {
    regime = args.regime === undefined ? 'new' : V.oneOf(args.regime, 'regime', ['new', 'old']);
    if (args.regime === undefined) defaults.push({ field: 'regime', value: 'new', material: true, note: 'The new regime (section 202) is the statutory default. Use regime "old" or compare_tax_regimes to see the old regime.' });
  }
  const residency = args.residency === undefined ? 'resident' : V.oneOf(args.residency, 'residency', ['resident', 'non_resident']);
  if (args.residency === undefined) defaults.push({ field: 'residency', value: 'resident', material: true, note: 'Assumed resident. Non-residents get no rebate (up to ₹60,000 less relief) — say so if you are an NRI.' });
  const ageBand = args.age_band === undefined ? 'below_60' : V.oneOf(args.age_band, 'age_band', ['below_60', '60_to_79', '80_plus']);
  if (args.age_band === undefined) defaults.push({ field: 'age_band', value: 'below_60', material: comparison || regime === 'old', note: 'Age only changes the old-regime exemption limit (₹3 lakh at 60–79, ₹5 lakh at 80+, residents only).' });
  const deductions = args.old_regime_deductions === undefined ? {} : V.oldDeductions(args.old_regime_deductions, 1e11);
  return { regime, residency, ageBand, deductions };
}

/* ---- calculate_tax ------------------------------------------------------ */
export const calculateTax = wrap((args) => {
  V.plainObject(args, 'arguments');
  V.onlyKeys(args, COMMON_CALC_FIELDS, null);
  const key = V.country(args.country);
  V.assertApplicable(key, args, ['regime', 'residency', 'age_band', 'old_regime_deductions', 'has_children']);
  const e = COUNTRIES[key];
  const ty = V.taxYear(key, args.tax_year);
  const R = getRules(key, ty.year);
  if (args.gross_income === undefined) {
    throw new V.InputError('missing_input', `I need the gross annual income in ${e.profile.currency.code} (before tax).`, { field: 'gross_income' });
  }
  const gross = V.amount(args.gross_income, 'gross_income', V.maxIncome(key), `annual amount in ${e.profile.currency.code}`);
  V.incomeType(args.income_type, scopeLabel(key, R));
  const status = V.filingStatus(key, args.filing_status);
  const region = V.region(key, args.region);

  const defaults = [];
  const notes = [];
  if (ty.defaulted) defaults.push({ field: 'tax_year', value: ty.year, material: false, note: `Using ${R.taxYearLabel}.` });
  if (ty.note) notes.push(ty.note);
  if (key === 'UK' && region === null) defaults.push({ field: 'region', value: 'england_wales_northern_ireland', material: true, note: 'England, Wales and Northern Ireland bands. Scottish taxpayers are not supported.' });

  const opts = { status, region: key === 'UK' ? null : region };
  if (key === 'IN') Object.assign(opts, indiaArgs(args, defaults));
  if (key === 'DE') {
    opts.childless = args.has_children === undefined ? true : !V.bool(args.has_children, 'has_children');
    if (args.has_children === undefined) defaults.push({ field: 'has_children', value: false, material: false, note: 'Childless care-insurance surcharge (0.6% of pay up to €69,750) applied.' });
  }
  if (key === 'IN' && opts.regime === 'new' && Object.keys(opts.deductions).length) notes.push('Old-regime deductions were ignored: they are not available under the new regime (use compare_tax_regimes).');

  const run = runDirect(key, gross, opts, ty.year);
  const c = run.calc;

  const includeIndirect = args.include_indirect_estimate === undefined ? true : V.bool(args.include_indirect_estimate, 'include_indirect_estimate');
  let indirect;
  if (includeIndirect) {
    const userSpend = args.monthly_spending === undefined ? null : V.spending(args.monthly_spending, V.maxIncome(key) / 12);
    const spend = userSpend ? { ...defaultSpending(0), ...userSpend } : defaultSpending(gross);
    if (userSpend && Object.keys(userSpend).length < CATEGORIES.length) notes.push('Spending categories you did not give are counted as zero in the indirect-tax estimate.');
    if (!userSpend) defaults.push({ field: 'monthly_spending', value: 'typical_profile', material: true, note: 'Indirect tax uses Tax.cal’s typical-household spending profile (about 22.5% of gross pay spent in six taxed categories). Give monthly spending for a personal estimate.' });
    const ind = indirectEstimate(key, R, spend, key === 'US' || key === 'CA' ? region : null);
    indirect = {
      included: true,
      basis: userSpend ? 'user_spending' : 'typical_spending_profile',
      total: r2(ind.total), consumption_tax: r2(ind.consumption), fuel_tax: r2(ind.fuel),
      by_category: ind.byCat.map((b) => ({ category: b.id, label: b.label, monthly_spend: r2(b.monthly), effective_rate: r4(b.fraction), nominal_rate: b.nominalRate == null ? null : r4(b.nominalRate), annual_tax: r2(b.annual), confidence: b.conf === 'med' ? 'medium' : b.conf, reason: b.reason })),
      method: 'Tax-inclusive: tax = spending × rate ÷ (1 + rate) for a single rate, blended per category. 20% VAT inside a £10 purchase is £1.67, not £2.'
    };
  } else {
    indirect = { included: false, reason: 'Excluded at the caller’s request.' };
  }

  const totalDirect = run.direct.total;
  const totalEstimated = totalDirect + (indirect.included ? indirect.total : 0);
  const conf = run.confidence;
  const confidence = {
    direct_tax: conf.direct_tax,
    social_contributions: conf.social_contributions,
    regional_tax: conf.regional_tax,
    indirect_tax: indirect.included ? conf.indirect_tax : 'not_applicable'
  };

  const result = {
    country: key, country_name: e.profile.name,
    tax_year: R.taxYear, tax_year_label: R.taxYearLabel, legal_basis: R.legalBasis,
    currency: e.profile.currency.code,
    inputs: {
      gross_income: gross, income_type: 'employment',
      ...(key === 'US' ? { filing_status: status === 'mfj' ? 'married_filing_jointly' : 'single' } : {}),
      ...(region ? { region } : {}),
      ...(key === 'IN' ? { regime: opts.regime, residency: opts.residency, age_band: opts.ageBand } : {}),
      ...(key === 'DE' ? { has_children: !opts.childless } : {})
    },
    defaults_applied: defaults,
    gross_income: r2(gross),
    taxable_income: r2(c.taxableIncome),
    direct_tax: r2(c.incomeTax),
    social_contributions: r2(c.social),
    regional_tax: r2(c.regional),
    total_direct_tax: r2(totalDirect),
    indirect_tax_estimate: indirect,
    total_estimated_tax: r2(totalEstimated),
    effective_rate: { direct: r4(gross > 0 ? totalDirect / gross : 0), total_including_indirect: r4(gross > 0 ? totalEstimated / gross : 0) },
    net_income: r2(gross - totalDirect),
    monthly_net_income: r2((gross - totalDirect) / 12),
    monthly_direct_tax: r2(totalDirect / 12),
    breakdown: c.lines.map((l) => ({ key: l.key, label: l.label, amount: r2(l.amount), kind: l.kind })),
    notes: [...notes, ...c.notes],
    confidence,
    assumptions: [...R.assumptions],
    exclusions: [...R.exclusions],
    sources: sourcesOut(R),
    rule_version: R.ruleVersion, last_verified: R.lastVerified, engine_version: ENGINE_VERSION,
    disclaimer: DISCLAIMER,
    learn_more: learnMore(key, region)
  };
  if (key === 'IN') {
    const d = c.details;
    result.regime_comparison = {
      chosen_regime: d.regime,
      new_regime_tax: r2(d.regime === 'new' ? d.chosen.total : d.other.total),
      old_regime_tax: r2(d.regime === 'old' ? d.chosen.total : d.other.total),
      note: 'Old-regime figure uses the deductions supplied (none if omitted). Use compare_tax_regimes for the full side-by-side.'
    };
  }
  return result;
});

/* ---- compare_tax_regimes (India) ---------------------------------------- */
function regimeOut(R, t, gross) {
  const total = t.total;
  return {
    name: t.regime === 'new' ? `New regime (${R.sections.newRegime}) — the default` : 'Old regime (opt-in)',
    standard_deduction: r2(t.standardDeduction),
    deductions_allowed: r2(t.deductions.total),
    deductions_detail: t.deductions.items.map((i) => ({ item: i.key, claimed: r2(i.claimed), allowed: r2(i.allowed), cap: i.cap })),
    taxable_income: r2(t.taxable),
    tax_on_slabs: r2(t.slabTax),
    rebate: r2(t.rebate),
    rebate_marginal_relief_applied: t.rebateMarginalRelief,
    surcharge_rate: t.surchargeRate,
    surcharge: r2(t.surcharge),
    surcharge_marginal_relief: r2(t.surchargeRelief),
    cess: r2(t.cess),
    total_tax: r2(total),
    effective_rate: r4(gross > 0 ? total / gross : 0),
    monthly_tax: r2(total / 12),
    net_income: r2(gross - total),
    monthly_net_income: r2((gross - total) / 12)
  };
}

export const compareTaxRegimes = wrap((args) => {
  V.plainObject(args, 'arguments');
  V.onlyKeys(args, ['country', 'tax_year', 'gross_income', 'residency', 'age_band', 'old_regime_deductions'], null);
  const key = V.country(args.country === undefined ? 'IN' : args.country);
  if (key !== 'IN') throw new V.InputError('unsupported_scope', `Regime comparison is available for India only. ${COUNTRIES[key].profile.name} has a single regime — use calculate_tax.`, { field: 'country', allowed: ['IN'] });
  const ty = V.taxYear(key, args.tax_year);
  const R = getRules(key, ty.year);
  if (args.gross_income === undefined) throw new V.InputError('missing_input', 'I need the gross annual salary in INR (e.g. 2000000 for ₹20 lakh).', { field: 'gross_income' });
  const gross = V.amount(args.gross_income, 'gross_income', V.maxIncome(key), 'annual salary in INR');
  const defaults = [];
  if (ty.defaulted) defaults.push({ field: 'tax_year', value: ty.year, material: false, note: `Using ${R.taxYearLabel}.` });
  const ia = indiaArgs(args, defaults, { comparison: true });
  if (args.old_regime_deductions === undefined) defaults.push({ field: 'old_regime_deductions', value: {}, material: true, note: 'No old-regime deductions supplied, so the old regime is shown with the standard deduction only. 80C, 80D, HRA and home-loan interest can change the answer.' });
  const input = { gross, residency: ia.residency, ageBand: ia.ageBand, deductions: ia.deductions };
  const nw = regimeFromSalary(R, 'new', input);
  const old = regimeFromSalary(R, 'old', input);
  const diff = old.total - nw.total;
  const be = breakevenDeductions(R, input);

  const points = [];
  points.push(`The new regime allows a ₹${groupIN(nw.standardDeduction)} standard deduction and wider, lower slabs; the old regime allows ₹${groupIN(old.standardDeduction)} plus deductions such as 80C, 80D, HRA and home-loan interest.`);
  if (ia.residency === 'resident') points.push('Residents get a rebate that removes all tax up to ₹12 lakh of taxable income in the new regime, and up to ₹5 lakh in the old regime.');
  else points.push('As a non-resident, no rebate applies in either regime.');
  if (be === 0) points.push('The old regime is already lower or equal with the deductions supplied.');
  else if (be != null) points.push(`On these inputs the old regime would only match the new regime with about ₹${groupIN(be)} of total deductions and exemptions.`);
  else points.push('On these inputs no realistic amount of old-regime deductions brings the old regime down to the new regime’s tax.');

  return {
    country: key, country_name: 'India', tax_year: R.taxYear, tax_year_label: R.taxYearLabel, legal_basis: R.legalBasis,
    currency: 'INR', gross_income: r2(gross),
    inputs: { gross_income: gross, residency: ia.residency, age_band: ia.ageBand, old_regime_deductions: ia.deductions },
    defaults_applied: defaults,
    regimes: { new: regimeOut(R, nw, gross), old: regimeOut(R, old, gross) },
    difference: { old_minus_new: r2(diff), lower_estimated_tax: Math.abs(diff) < 0.5 ? 'equal' : diff > 0 ? 'new' : 'old' },
    old_regime_breakeven_deductions: be,
    explanation: points,
    eligibility_caveats: [
      'Salaried individuals without business income can choose the regime each year when filing; with business income, switching is restricted.',
      'Deductions are capped at their statutory limits (80C ₹1.5 lakh, 80CCD(1B) ₹50,000, 80D up to ₹1 lakh, self-occupied home-loan interest ₹2 lakh); HRA exemption must be computed from your actual rent and salary.',
      'This comparison is illustrative and depends on the inputs given; it is not advice about which regime to choose.'
    ],
    confidence: { direct_tax: 'high', deductions: Object.keys(ia.deductions).length ? 'depends_on_inputs' : 'not_applicable' },
    assumptions: [...R.assumptions],
    exclusions: [...R.exclusions],
    sources: sourcesOut(R).filter((s, i) => i < 8),
    rule_version: R.ruleVersion, last_verified: R.lastVerified, engine_version: ENGINE_VERSION,
    disclaimer: DISCLAIMER,
    learn_more: learnMore(key, null)
  };
});

/* ---- get_tax_rules ------------------------------------------------------ */
const TOPICS = ['all', 'income_tax', 'social_contributions', 'regional_tax', 'indirect_tax', 'scope', 'sources'];
const INDIRECT_METHOD = 'Rates are shares of TAX-INCLUSIVE spending: a 20% VAT is 1/6 (16.7%) of what you pay. Categories mix items taxed at different rates, so these are estimates.';
const TYPICAL_PROFILE = () => CATEGORIES.map((cat) => ({ category: cat.id, share_of_monthly_gross: cat.def }));

/* Without a country: what Tax.cal covers, how fresh each rule set is, and the
   assumptions shared by every country. */
const OVERVIEW_ASSUMPTIONS = [
  'One individual employee with salary or wage income only.',
  'Direct tax applies each country’s statutory rates, thresholds, deductions and credits for the stated tax year. Regional tax is modelled where a country needs it: US states, Canadian provinces, a representative Spanish regional scale and Milan’s Italian surcharges.',
  'Indirect tax (VAT, GST, sales tax and fuel duty) is an estimate: monthly spending in six categories × an effective rate per category, computed tax-inclusively. Without the user’s spending, a typical-household profile is used and reported.',
  'Exchange rates are used only to compare one salary across countries. They are dated ECB reference rates and approximate.'
];
const OVERVIEW_EXCLUSIONS = [
  'Self-employment, business, rental, pension and investment income, and capital gains.',
  'Companies, partnerships, trusts and Indian HUFs and firms.',
  'Filing returns, paying tax, TDS/GST/VAT filings or any submission to a tax authority.',
  'Local and city income taxes, and personal circumstances such as dependants, unless a country option says otherwise.',
  'Personal tax, legal or financial advice.'
];

function rulesOverview(topic) {
  const want = (t) => topic === 'all' || topic === t;
  const out = {
    lookup: 'overview',
    topic,
    engine_version: ENGINE_VERSION,
    countries: ORDER.map((k) => {
      const e = COUNTRIES[k];
      const R = getRules(k);
      return {
        country: k, country_name: e.profile.name, currency: e.profile.currency.code,
        tax_year: R.taxYear, tax_year_label: R.taxYearLabel, status: R.status,
        rule_version: R.ruleVersion, last_verified: R.lastVerified,
        supported_tax_years: Object.keys(e.rules),
        confidence: { ...R.confidence }
      };
    })
  };
  if (want('indirect_tax')) {
    out.indirect_tax = {
      method: INDIRECT_METHOD,
      categories: CATEGORIES.map((cat) => ({ category: cat.id, label: cat.label })),
      typical_spending_profile: TYPICAL_PROFILE(),
      by_country: ORDER.map((k) => {
        const I = getRules(k).indirectTax;
        return { country: k, name: I.name, standard_rate: I.standardRate ?? null, model: (I.model || 'category_effective_rates').replace(/-/g, '_') };
      }),
      note: 'Category rates, reasons and confidence differ by country: ask for one country with topic "indirect_tax" for the full table.'
    };
  }
  out.assumptions = [...OVERVIEW_ASSUMPTIONS];
  out.exclusions = [...OVERVIEW_EXCLUSIONS];
  out.sources = [{ title: FX.source.title, publisher: FX.source.publisher, url: FX.source.url, covers: 'Approximate exchange rates for cross-country comparisons only' }];
  out.notes = ['Each country’s official sources (tax authorities and legislation) are listed when you look up that country.'];
  out.learn_more = { label: 'How Tax.cal estimates hidden taxes', url: `${SITE}/hidden-tax/?${UTM}` };
  return out;
}

function rulesSection(key, R, topic) {
  const e = COUNTRIES[key];
  const out = {};
  const want = (t) => topic === 'all' || topic === t;
  if (want('income_tax')) {
    out.income_tax = jsonify(key === 'IN' ? {
      new_regime: R.newRegime, old_regime: R.oldRegime, cess: R.cess,
      rebate_residents_only: R.rebateResidentsOnly, sections: R.sections
    } : R.incomeTax);
  }
  if (want('social_contributions')) out.social_contributions = jsonify(R.socialTax || null);
  if (want('regional_tax')) {
    out.regional_tax = jsonify(R.regionalTax || null);
    if (e.regions) out.regions = Object.keys(e.regions).map((k) => ({ code: k, name: e.regions[k].name }));
  }
  if (want('indirect_tax')) {
    const I = R.indirectTax;
    out.indirect_tax = {
      name: I.name, standard_rate: I.standardRate ?? null, model: (I.model || 'category_effective_rates').replace(/-/g, '_'),
      basis: I.basis || null,
      categories: CATEGORIES.map((cat) => {
        const c = I.categories[cat.id];
        return {
          category: cat.id, label: cat.label,
          effective_rate: c.effectiveRate ?? null,
          taxable_share: c.taxableShare ?? null,
          nominal_rate: c.nominalRate ?? null,
          confidence: c.confidence === 'med' ? 'medium' : c.confidence,
          reason: c.reason
        };
      }),
      method: INDIRECT_METHOD,
      typical_spending_profile: TYPICAL_PROFILE()
    };
  }
  if (want('scope')) out.scope = R.scope || { supported: ['Single employee with salary income'], unsupported: R.exclusions };
  return out;
}

export const getTaxRules = wrap((args) => {
  V.plainObject(args, 'arguments');
  V.onlyKeys(args, ['country', 'tax_year', 'topic'], null);
  const topic = args.topic === undefined ? 'all' : V.oneOf(args.topic, 'topic', TOPICS);
  if (args.country === undefined) {
    if (args.tax_year !== undefined) throw new V.InputError('missing_input', 'Which country is that tax year for?', { field: 'country', allowed: [...ORDER] });
    return rulesOverview(topic);
  }
  const key = V.country(args.country);
  const e = COUNTRIES[key];
  const ty = V.taxYear(key, args.tax_year);
  const R = getRules(key, ty.year);
  const result = {
    lookup: 'country',
    country: key, country_name: e.profile.name,
    tax_year: R.taxYear, tax_year_label: R.taxYearLabel, status: R.status, legal_basis: R.legalBasis,
    currency: e.profile.currency.code,
    rule_version: R.ruleVersion, last_verified: R.lastVerified, engine_version: ENGINE_VERSION,
    supported_tax_years: Object.keys(e.rules).map((y) => ({ tax_year: y, label: e.rules[y].taxYearLabel, status: e.rules[y].status })),
    topic,
    ...rulesSection(key, R, topic),
    confidence: { ...R.confidence },
    assumptions: [...R.assumptions],
    exclusions: [...R.exclusions],
    sources: sourcesOut(R),
    notes: ty.note ? [ty.note] : [],
    learn_more: { label: 'How Tax.cal estimates hidden taxes', url: `${SITE}/hidden-tax/?${UTM}` }
  };
  if (key === 'IN') {
    result.terminology = {
      tax_year: 'From 1 April 2026 the Income-tax Act, 2025 uses a single "tax year" (1 April–31 March). Tax Year 2026-27 replaces the old "previous year / assessment year" pair.',
      legacy: 'Income earned in FY 2025-26 is still assessed in AY 2026-27 under the Income-tax Act, 1961. AY 2026-27 and Tax Year 2026-27 are different obligations.'
    };
  }
  return result;
});

/* ---- compare_countries -------------------------------------------------- */
const CURRENCIES = [...new Set(ORDER.map((k) => COUNTRIES[k].profile.currency.code))];

export const compareCountries = wrap((args) => {
  V.plainObject(args, 'arguments');
  V.onlyKeys(args, ['gross_income', 'currency', 'countries', 'include_indirect_estimate'], null);
  if (args.gross_income === undefined) throw new V.InputError('missing_input', 'I need the annual gross income to compare.', { field: 'gross_income' });
  if (args.currency === undefined) throw new V.InputError('missing_input', `I need the currency of that income (${CURRENCIES.join(', ')}).`, { field: 'currency', allowed: CURRENCIES });
  const cur = V.str(args.currency, 'currency').toUpperCase();
  if (!CURRENCIES.includes(cur)) throw new V.InputError('invalid_input', `Currency must be one of ${CURRENCIES.join(', ')}.`, { field: 'currency', allowed: CURRENCIES });
  const gross = V.amount(args.gross_income, 'gross_income', cur === 'INR' ? 1e11 : 1e9);
  let keys = [...ORDER];
  if (args.countries !== undefined) {
    if (!Array.isArray(args.countries) || args.countries.length < 1 || args.countries.length > ORDER.length) {
      throw new V.InputError('invalid_input', `countries must be a list of 1–${ORDER.length} country codes.`, { field: 'countries', allowed: [...ORDER] });
    }
    keys = [...new Set(args.countries.map((c) => V.country(c)))];
  }
  const includeIndirect = args.include_indirect_estimate === undefined ? false : V.bool(args.include_indirect_estimate, 'include_indirect_estimate');

  const rows = keys.map((k) => {
    const e = COUNTRIES[k];
    const R = getRules(k);
    const local = convert(gross, cur, e.profile.currency.code);
    const region = k === 'US' ? null : k === 'CA' ? 'ON' : null;
    const run = runDirect(k, local, { status: 'single', region, regime: 'new', residency: 'resident' });
    const row = {
      country: k, country_name: e.profile.name, tax_year: R.taxYear, currency: e.profile.currency.code,
      gross_income_local: r2(local),
      direct_tax: r2(run.calc.incomeTax), social_contributions: r2(run.calc.social), regional_tax: r2(run.calc.regional),
      total_direct_tax: r2(run.direct.total),
      direct_rate: r4(local > 0 ? run.direct.total / local : 0),
      confidence: minConfidence(run.confidence.direct_tax, run.confidence.social_contributions, run.confidence.regional_tax),
      representative_assumption: k === 'US' ? 'Federal income tax + FICA only (no state)' : k === 'CA' ? 'Ontario' : k === 'IN' ? 'New regime, resident' : k === 'IT' ? 'Milan (Lombardy) surcharges' : k === 'ES' ? 'Representative regional scale' : 'Single employee',
      rule_version: R.ruleVersion
    };
    if (includeIndirect) {
      const ind = indirectEstimate(k, R, defaultSpending(local), region);
      row.indirect_tax_estimate = r2(ind.total);
      row.total_rate_including_indirect = r4(local > 0 ? (run.direct.total + ind.total) / local : 0);
    }
    return row;
  });

  return {
    gross_income: gross, currency: cur,
    rows,
    order: 'As requested (not a ranking).',
    fx: { source: FX.source, date: FX.date, base: FX.base, rates_per_EUR: { ...FX.perEUR }, note: FX.note },
    caveats: [
      'Exchange rates are approximate and dated; a different rate changes every figure.',
      'This compares tax on one salary under each country’s rules. It is not a cost-of-living or purchasing-power comparison and says nothing about what taxes fund.',
      'Direct tax and the optional indirect-tax estimate are reported separately; indirect tax uses a typical spending profile.'
    ],
    engine_version: ENGINE_VERSION,
    disclaimer: DISCLAIMER,
    learn_more: { label: 'See the same salary across countries on Tax.cal', url: `${SITE}/tax-by-country/?${UTM}` }
  };
});

export { breakevenDeductions };

/* ---- discovery helpers -------------------------------------------------- */
export function supportedJurisdictions() {
  return ORDER.map((k) => {
    const e = COUNTRIES[k];
    return {
      country: k, name: e.profile.name, currency: e.profile.currency.code,
      tax_years: Object.keys(e.rules), default_tax_year: e.defaultYear,
      regions: e.regions ? Object.keys(e.regions) : (k === 'UK' ? ['england', 'wales', 'northern_ireland'] : [])
    };
  });
}
