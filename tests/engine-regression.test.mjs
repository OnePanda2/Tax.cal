/* The v18 engine's output for 885 inputs is frozen in
   tests/fixtures/baseline-engine-v18.json. Models that were NOT meant to
   change must reproduce it exactly; models that were deliberately corrected
   are listed here with the reason, and get their own golden tests. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compute, defaultSpending } from '../packages/tax-core/src/index.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/baseline-engine-v18.json', import.meta.url), 'utf8'));
const run = (c) => compute({ countryKey: c.key, gross: c.gross, filingStatus: c.status, region: c.region, spend: defaultSpending(c.gross) });
const EPS = 1e-6;

/* Deliberate changes, by country (see IMPLEMENTATION_PLAN.md §8). */
const CHANGED_DIRECT = {
  CA: 'B7 CPP/EI/CEA credits, enhanced-CPP deduction, Ontario surtax + OHP, Quebec abatement/QPP/QPIP',
  AU: 'B8 LITO, Medicare low-income reduction, $1,000 standard work deduction',
  IE: 'B9 PRSI 4.2% → 4.35% only from 1 Oct 2026, weekly threshold and credit',
  DE: 'B3 2026 ceilings/rates, §32a formula on taxable income, Soli',
  FR: 'B4 taxable base after deductible contributions, décote, PSS-based contributions',
  NL: 'B10 exact 2026 arbeidskorting build-up; 6.398% AHK phase-out',
  ES: 'B6 SS deducted from IRPF base, work-income reduction, 2026 SS rate/ceiling',
  IT: 'B5 IRPEF on income after INPS, statutory credits, cuneo, Lombardy/Milan surcharges'
};
const CHANGED_INDIRECT = { DE: 'restaurant food 7% from 2026', IE: 'food & catering 9% from 1 Jul 2026' };

test('baseline fixture is the expected size', () => {
  assert.equal(baseline.cases.length, 885);
});

test('US federal income tax, FICA and the 49 non-California state proxies are unchanged', () => {
  let n = 0;
  for (const c of baseline.cases.filter((x) => x.key === 'US' && x.region !== 'CA')) {
    const r = run(c);
    for (const k of ['income', 'social', 'state', 'total']) {
      assert.ok(Math.abs(r.direct[k] - c.direct[k]) < EPS, `US ${c.region} ${c.status} ${c.gross} ${k}: ${r.direct[k]} vs ${c.direct[k]}`);
    }
    n++;
  }
  assert.ok(n > 500);
});

test('UK is unchanged up to £100,000 (the taper fix only affects incomes above it)', () => {
  for (const c of baseline.cases.filter((x) => x.key === 'UK')) {
    const r = run(c);
    if (c.gross <= 100000) {
      assert.ok(Math.abs(r.direct.total - c.direct.total) < EPS, `UK ${c.gross}`);
    } else {
      // v18 let the basic-rate band widen as the allowance tapered: it
      // under-charged by 20% of the tapered amount.
      const tapered = Math.min(12570, (c.gross - 100000) / 2);
      assert.ok(Math.abs(r.direct.total - c.direct.total - 0.2 * tapered) < 1e-6, `UK ${c.gross} taper fix`);
    }
  }
});

test('indirect-tax estimates are unchanged except the two sourced dining-VAT updates', () => {
  for (const c of baseline.cases) {
    const r = run(c);
    if (CHANGED_INDIRECT[c.key]) continue;
    assert.ok(Math.abs(r.indirect.total - c.indirect.total) < EPS, `${c.key} ${c.region} ${c.gross} indirect`);
  }
});

test('every deliberately changed country actually changed (no silent no-ops)', () => {
  for (const key of Object.keys(CHANGED_DIRECT)) {
    const cases = baseline.cases.filter((x) => x.key === key && x.gross >= 30000);
    const changed = cases.filter((c) => Math.abs(run(c).direct.total - c.direct.total) > 1);
    assert.ok(changed.length > 0, `${key}: ${CHANGED_DIRECT[key]}`);
  }
});
