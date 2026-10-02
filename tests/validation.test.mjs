/* Every argument is untrusted: from the client, from the model, from anyone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTax, compareCountries, getTaxRules, compareTaxRegimes, ORDER } from '../packages/tax-core/src/index.js';

const err = (r) => { assert.equal(r.ok, false, JSON.stringify(r).slice(0, 200)); return r.error; };

test('rejects negative, NaN, Infinity, strings and objects as income', () => {
  assert.equal(err(calculateTax({ country: 'UK', gross_income: -1 })).code, 'out_of_range');
  for (const bad of [NaN, Infinity, -Infinity, '50000', null, {}, [], true]) {
    assert.equal(err(calculateTax({ country: 'UK', gross_income: bad })).code, 'invalid_input', String(bad));
  }
});

test('rejects absurd incomes per currency', () => {
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1e9 + 1 })).code, 'out_of_range');
  assert.equal(calculateTax({ country: 'IN', gross_income: 1e10 }).ok, true);   // ₹1,000 crore is allowed
  assert.equal(err(calculateTax({ country: 'IN', gross_income: 1e11 + 1 })).code, 'out_of_range');
});

test('missing material inputs produce precise questions, not guesses', () => {
  const us = err(calculateTax({ country: 'US', gross_income: 120000, region: 'CA' }));
  assert.equal(us.code, 'missing_input'); assert.equal(us.field, 'filing_status');
  assert.match(us.message, /filing status/);
  assert.equal(err(calculateTax({ country: 'US', gross_income: 1, filing_status: 'single' })).field, 'region');
  assert.equal(err(calculateTax({ country: 'CA', gross_income: 1 })).field, 'region');
  assert.equal(err(calculateTax({ country: 'UK' })).field, 'gross_income');
  assert.equal(err(calculateTax({ gross_income: 1 })).field, 'country');
});

test('malformed countries, regions, years and filing statuses', () => {
  assert.equal(err(calculateTax({ country: 'XX', gross_income: 1 })).code, 'unsupported_country');
  assert.equal(err(calculateTax({ country: 'Atlantis', gross_income: 1 })).code, 'unsupported_country');
  assert.equal(err(calculateTax({ country: 'US', gross_income: 1, filing_status: 'single', region: 'ZZ' })).code, 'unsupported_region');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, region: 'scotland' })).code, 'unsupported_region');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, tax_year: '2019-20' })).code, 'unsupported_tax_year');
  assert.equal(err(calculateTax({ country: 'US', gross_income: 1, region: 'TX', filing_status: 'head_of_household' })).code, 'unsupported_scope');
  assert.equal(err(calculateTax({ country: 'US', gross_income: 1, region: 'TX', filing_status: 'banana' })).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'DE', gross_income: 1, region: 'Bavaria' })).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'DE', gross_income: 1, regime: 'old' })).code, 'invalid_input');
});

test('accepts the GB alias, state names and case-insensitive codes', () => {
  assert.equal(calculateTax({ country: 'gb', gross_income: 50000 }).result.country, 'UK');
  assert.equal(calculateTax({ country: 'US', gross_income: 50000, filing_status: 'mfj', region: 'new york' }).result.inputs.region, 'NY');
});

test('rejects unknown fields and prototype-pollution keys at every level', () => {
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, salary: 2 })).code, 'invalid_input');
  assert.equal(err(calculateTax(JSON.parse('{"country":"UK","gross_income":1,"__proto__":{"admin":true}}'))).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, monthly_spending: JSON.parse('{"constructor":{"x":1}}') })).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, monthly_spending: { rent: 900 } })).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'IN', gross_income: 1, old_regime_deductions: { section_80g: 1 } })).code, 'invalid_input');
  assert.equal(({}).admin, undefined, 'Object.prototype untouched');
});

test('rejects non-object arguments and oversized strings', () => {
  for (const bad of [null, 'UK', 42, [], [{ country: 'UK' }]]) assert.equal(err(calculateTax(bad)).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'U'.repeat(65), gross_income: 1 })).code, 'invalid_input');
});

test('spending must be non-negative finite numbers', () => {
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, monthly_spending: { fuel: -5 } })).code, 'out_of_range');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, monthly_spending: { fuel: '5' } })).code, 'invalid_input');
  assert.equal(err(calculateTax({ country: 'UK', gross_income: 1, include_indirect_estimate: 'yes' })).code, 'invalid_input');
});

test('compare_countries validates currency and the country list', () => {
  assert.equal(err(compareCountries({ gross_income: 1 })).field, 'currency');
  assert.equal(err(compareCountries({ gross_income: 1, currency: 'JPY' })).code, 'invalid_input');
  assert.equal(err(compareCountries({ gross_income: 1, currency: 'EUR', countries: 'DE' })).code, 'invalid_input');
  assert.equal(err(compareCountries({ gross_income: 1, currency: 'EUR', countries: [] })).code, 'invalid_input');
  assert.equal(err(compareCountries({ gross_income: 1, currency: 'EUR', countries: ['DE', 'XX'] })).code, 'unsupported_country');
  const ok = compareCountries({ gross_income: 60000, currency: 'EUR', countries: ['DE', 'FR', 'DE'] });
  assert.equal(ok.result.rows.length, 2, 'duplicates removed');
  assert.equal(ok.result.rows[0].country, 'DE', 'kept in requested order');
});

test('get_tax_rules validates the topic; compare_tax_regimes validates residency', () => {
  assert.equal(err(getTaxRules({ country: 'UK', topic: 'everything' })).code, 'invalid_input');
  assert.equal(err(compareTaxRegimes({ gross_income: 1, residency: 'martian' })).code, 'invalid_input');
});

test('every supported country produces a complete, well-formed result', () => {
  for (const country of ORDER) {
    const args = { country, gross_income: country === 'IN' ? 2000000 : 60000 };
    if (country === 'US') Object.assign(args, { filing_status: 'single', region: 'TX' });
    if (country === 'CA') args.region = 'BC';
    const r = calculateTax(args);
    assert.equal(r.ok, true, country);
    const x = r.result;
    for (const k of ['country', 'tax_year', 'currency', 'gross_income', 'taxable_income', 'direct_tax', 'social_contributions', 'regional_tax', 'total_direct_tax', 'indirect_tax_estimate', 'total_estimated_tax', 'effective_rate', 'net_income', 'monthly_net_income', 'breakdown', 'assumptions', 'confidence', 'sources', 'rule_version', 'last_verified', 'disclaimer', 'learn_more']) {
      assert.ok(x[k] !== undefined, `${country} missing ${k}`);
    }
    assert.ok(x.sources.length >= 1 && x.assumptions.length >= 1, country);
    for (const v of Object.values(x.confidence)) assert.ok(['high', 'medium', 'low', 'not_applicable'].includes(v), `${country} confidence ${v}`);
    assert.ok(Math.abs(x.total_direct_tax - (x.direct_tax + x.social_contributions + x.regional_tax)) < 0.02, `${country} components add up`);
    assert.ok(Math.abs(x.net_income - (x.gross_income - x.total_direct_tax)) < 0.02, `${country} net`);
  }
});
