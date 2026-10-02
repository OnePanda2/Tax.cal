/* India — Tax Year 2026-27 (Income-tax Act, 2025) and legacy FY 2025-26.
   Every expected value below is worked out by hand from the slab table,
   §156 / §87A, the Finance Act surcharge rules and the 4% cess. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRules, regimeTax, regimeFromSalary, calculateTax, compareTaxRegimes, getTaxRules, breakevenDeductions } from '../packages/tax-core/src/index.js';
import { capOldDeductions } from '../packages/tax-core/src/calc/in.js';
import { groupIN } from '../packages/tax-core/src/util.js';
import { close } from './helpers.mjs';

const R = getRules('IN', '2026-27');
const L = getRules('IN', '2025-26');
const NEW = (taxable, residency = 'resident') => regimeTax(R, 'new', taxable, residency, 'below_60');
const OLD = (taxable, residency = 'resident', age = 'below_60') => regimeTax(R, 'old', taxable, residency, age);

test('new-regime slab tax at every slab edge (just below / at / just above)', () => {
  const edges = [
    [399999, 0], [400000, 0], [400001, 0.05],
    [799999, 19999.95], [800000, 20000], [800001, 20000.1],
    [1199999, 59999.9], [1200000, 60000], [1200001, 60000.15],
    [1599999, 119999.85], [1600000, 120000], [1600001, 120000.2],
    [1999999, 199999.8], [2000000, 200000], [2000001, 200000.25],
    [2399999, 299999.75], [2400000, 300000], [2400001, 300000.3]
  ];
  for (const [x, t] of edges) close(NEW(x, 'non_resident').slabTax, t, 0.005, `slab ${x}`);
});

test('Budget 2025-26 annex figures: tax on total income under the new slabs', () => {
  for (const [x, t] of [[800000, 20000], [900000, 30000], [1000000, 40000], [1100000, 50000], [1200000, 60000], [1600000, 120000], [2000000, 200000], [2400000, 300000], [5000000, 1080000]]) {
    close(NEW(x).slabTax, t, 0.005, `annex ${x}`);
  }
});

test('§156 rebate: nil tax up to ₹12 lakh; marginal relief up to ₹12,70,588; none after', () => {
  close(NEW(1200000).total, 0);
  close(NEW(1200010).total, 10.4);                 // tax limited to ₹10 above ₹12 lakh, + 4% cess
  assert.equal(NEW(1200010).rebateMarginalRelief, true);
  close(NEW(1270588).total, 73411.52, 0.01);       // relief of ₹0.20 still applies
  close(NEW(1270589).total, 73411.88, 0.01);       // no relief
  assert.equal(NEW(1270589).rebate, 0);
});

test('salaried: zero tax up to ₹12,75,000 salary, ₹10.40 at ₹12,75,010', () => {
  const s = (gross) => regimeFromSalary(R, 'new', { gross, residency: 'resident' }).total;
  close(s(1275000), 0); close(s(1275010), 10.4);
  close(s(1500000), 97500); close(s(2000000), 192400); close(s(2500000), 319800);
});

test('non-residents get no rebate in either regime and no senior exemption limits', () => {
  close(NEW(1200000, 'non_resident').total, 62400);
  close(OLD(500000, 'non_resident').total, 13000);
  close(OLD(600000, 'non_resident', '80_plus').total, 33800);     // general slabs despite age
  close(regimeFromSalary(R, 'new', { gross: 1000000, residency: 'non_resident' }).total, 33800);
});

test('old regime: ₹5 lakh rebate (no marginal relief) and senior-citizen bands', () => {
  close(OLD(500000).total, 0);
  close(OLD(500001).total, 13000.21, 0.01);
  close(OLD(300000, 'resident', '60_to_79').total, 0);
  close(OLD(600000, 'resident', '60_to_79').total, 31200);
  close(OLD(600000, 'resident', '80_plus').total, 20800);
  close(OLD(1450000).total, 257400);
});

test('surcharge with marginal relief at ₹50 lakh and ₹1 crore (new regime)', () => {
  close(NEW(5000000).total, 1123200);
  const a = NEW(5010000);
  close(a.surcharge, 7000); close(a.total, 1133600);
  close(NEW(10000000).total, 2951520);
  const b = NEW(10010000);
  close(b.surcharge, 265000); close(b.total, 2961920);
});

test('surcharge: 25% cap in the new regime; 37% with marginal relief at ₹5 crore in the old', () => {
  const n = NEW(60000000);
  assert.equal(n.surchargeRate, 0.25); close(n.total, 22854000);
  const o = OLD(50010000);
  assert.equal(o.surchargeRate, 0.37);
  close(o.surcharge, 3710125); close(o.total, 19266650);
});

test('cess is exactly 4% of tax after rebate plus surcharge', () => {
  for (const x of [1500000, 3000000, 7500000, 25000000]) {
    const t = NEW(x);
    close(t.cess, (t.taxAfterRebate + t.surcharge) * 0.04, 1e-6);
  }
});

test('old-regime deductions are capped at their statutory limits and at income', () => {
  const caps = R.oldRegime.deductionCaps;
  const d = capOldDeductions({ section_80c: 200000, section_80ccd_1b: 100000, section_80d: 200000, home_loan_interest: 300000, hra_exemption: 120000 }, caps, 10000000);
  const by = Object.fromEntries(d.items.map((i) => [i.key, i.allowed]));
  assert.deepEqual(by, { section_80c: 150000, section_80ccd_1b: 50000, section_80d: 100000, home_loan_interest: 200000, hra_exemption: 120000 });
  close(d.total, 620000);
  const tiny = capOldDeductions({ other: 900000 }, caps, 300000);
  close(tiny.total, 300000); assert.equal(tiny.limitedByIncome, true);
});

test('regime comparison at ₹20 lakh and the break-even deduction', () => {
  const input = { gross: 2000000, residency: 'resident', ageBand: 'below_60' };
  close(regimeFromSalary(R, 'new', input).total, 192400);
  close(regimeFromSalary(R, 'old', input).total, 413400);
  const be = breakevenDeductions(R, input);
  assert.equal(be, 708334);
  assert.ok(regimeFromSalary(R, 'old', { ...input, deductions: { other: be } }).total <= 192400);
  assert.ok(regimeFromSalary(R, 'old', { ...input, deductions: { other: be - 1 } }).total > 192400);
  assert.equal(breakevenDeductions(R, { gross: 600000, residency: 'resident' }), 50000);
});

test('legacy FY 2025-26 (AY 2026-27) is a separate rule set under the 1961 Act with the same amounts', () => {
  assert.equal(L.status, 'legacy');
  assert.match(L.legalBasis, /1961/);
  assert.match(R.legalBasis, /2025/);
  assert.equal(L.sections.rebate, 'section 87A');
  assert.equal(R.sections.rebate, 'section 156');
  for (const x of [1200000, 1500000, 5010000]) close(regimeTax(L, 'new', x, 'resident').total, NEW(x).total);
});

test('tax-year labels map to the right rule set and never silently mix the Acts', () => {
  const y = (tax_year) => calculateTax({ country: 'IN', gross_income: 1500000, tax_year });
  assert.equal(y('2026-27').result.tax_year, '2026-27');
  assert.equal(y('FY 2026-27').result.tax_year, '2026-27');
  assert.equal(y('Tax Year 2026-27').result.tax_year, '2026-27');
  const ay = y('AY 2026-27');
  assert.equal(ay.result.tax_year, '2025-26');
  assert.ok(ay.result.notes.some((n) => /FY 2025-26/.test(n) && /1961/.test(n)));
  assert.equal(y('AY 2027-28').result.tax_year, '2026-27');
  const bad = y('FY 2024-25');
  assert.equal(bad.ok, false); assert.equal(bad.error.code, 'unsupported_tax_year');
});

test('calculate_tax (India) reports the material defaults it applied', () => {
  const r = calculateTax({ country: 'IN', gross_income: 1500000 });
  assert.equal(r.ok, true);
  const fields = r.result.defaults_applied.map((d) => d.field);
  for (const f of ['regime', 'residency', 'monthly_spending']) assert.ok(fields.includes(f), f);
  assert.equal(r.result.total_direct_tax, 97500);
  assert.equal(r.result.regime_comparison.old_regime_tax, 257400);
  assert.equal(r.result.confidence.direct_tax, 'high');
  assert.equal(r.result.confidence.indirect_tax, 'low');
  assert.match(r.result.learn_more.url, /^https:\/\/taxcal\.siddheshthapa\.com\/\?utm_source=chatgpt.*#c=IN$/);
});

test('calculate_tax (India): explicit old regime with deductions, and NRI', () => {
  const old = calculateTax({ country: 'IN', gross_income: 1500000, regime: 'old', old_regime_deductions: { section_80c: 150000, section_80d: 25000 } });
  assert.equal(old.result.total_direct_tax, 202800);
  const nri = calculateTax({ country: 'IN', gross_income: 1000000, residency: 'non_resident' });
  assert.equal(nri.result.total_direct_tax, 33800);
  assert.ok(nri.result.notes.some((n) => /Non-residents/.test(n)));
});

test('unsupported Indian scope is refused clearly, never guessed', () => {
  const biz = calculateTax({ country: 'IN', gross_income: 1500000, income_type: 'business' });
  assert.equal(biz.ok, false); assert.equal(biz.error.code, 'unsupported_scope');
  const cg = calculateTax({ country: 'IN', gross_income: 1500000, income_type: 'capital_gains' });
  assert.equal(cg.error.code, 'unsupported_scope');
  assert.equal(calculateTax({ country: 'IN', gross_income: 1500000, region: 'MH' }).error.code, 'invalid_input');
  assert.equal(calculateTax({ country: 'IN', gross_income: 1500000, filing_status: 'married_filing_jointly' }).error.code, 'unsupported_scope');
});

test('compare_tax_regimes: shows both regimes and the difference without calling either "better"', () => {
  const r = compareTaxRegimes({ gross_income: 2000000 });
  assert.equal(r.ok, true);
  assert.equal(r.result.regimes.new.total_tax, 192400);
  assert.equal(r.result.regimes.old.total_tax, 413400);
  assert.equal(r.result.difference.old_minus_new, 221000);
  assert.equal(r.result.difference.lower_estimated_tax, 'new');
  assert.equal(r.result.old_regime_breakeven_deductions, 708334);
  assert.ok(!/\bbetter\b|\bbest\b|\brecommend/i.test(JSON.stringify(r.result)), 'no value judgement');
  assert.equal(compareTaxRegimes({ country: 'UK', gross_income: 50000 }).error.code, 'unsupported_scope');
});

test('get_tax_rules (India) explains the terminology, sources and verification date', () => {
  const r = getTaxRules({ country: 'IN' });
  assert.equal(r.ok, true);
  assert.equal(r.result.last_verified, '2026-10-02');
  assert.equal(r.result.rule_version, 'IN-2026-27-v1');
  assert.ok(r.result.terminology.tax_year.includes('Income-tax Act, 2025'));
  assert.ok(r.result.sources.some((s) => /incometaxindia\.gov\.in/.test(s.url || '')));
  assert.equal(r.result.income_tax.new_regime.slabs.at(-1)[1], null, 'open-ended slab is JSON null');
  assert.equal(r.result.supported_tax_years.length, 2);
});

test('India indirect tax: GST categories and the petrol share are transparent estimates', () => {
  const cats = R.indirectTax.categories;
  close(cats.fuel.effectiveRate, 0.279, 0.0005);
  close(cats.dining.effectiveRate, 5 / 105, 0.0005);
  assert.equal(cats.fuel.confidence, 'low');
  for (const c of Object.values(cats)) assert.ok(c.reason.length > 40);
});

test('Indian digit grouping matches en-IN formatting without needing Intl', () => {
  for (const n of [0, 7, 999, 1000, 75000, 99999, 100000, 708334, 1234567, 12345678, 123456789, 1e11, -1500000, 49999.6]) {
    assert.equal(groupIN(n), Math.round(n).toLocaleString('en-IN'), String(n));
  }
  const r = compareTaxRegimes({ gross_income: 2000000 }).result;
  assert.match(r.explanation[0], /₹75,000 standard deduction/);
  assert.match(r.explanation.join(' '), /₹7,08,334/);
});
