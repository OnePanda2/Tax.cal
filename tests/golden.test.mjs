/* Golden figures (tests/fixtures/golden.json) with their source, the date
   they were checked and an explicit tolerance — plus a below / at / above
   check of every bracket table in the rule data, against an independent
   formulation of bracket tax. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ORDER, COUNTRIES, US_STATES, CA_PROVINCES, getRules, calculateTax, regimeTax, bracketTax } from '../packages/tax-core/src/index.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/golden.json', import.meta.url), 'utf8')).cases;
const SOURCE_TYPES = ['official_table', 'official_worked_example', 'statutory_hand_calculation'];

test('every golden case says where its figure comes from, when it was checked, and how close it must be', () => {
  const ids = new Set();
  for (const g of golden) {
    assert.ok(!ids.has(g.id), g.id); ids.add(g.id);
    assert.ok(ORDER.includes(g.country), g.id);
    assert.ok(SOURCE_TYPES.includes(g.source_type), g.id);
    assert.match(g.checked, /^\d{4}-\d{2}-\d{2}$/, g.id);
    if (g.source_published) assert.match(g.source_published, /^\d{4}-\d{2}-\d{2}$/, g.id);
    assert.ok(typeof g.tolerance === 'number' && g.tolerance >= 0 && g.tolerance <= 0.01, `${g.id}: tolerance too wide`);
    assert.ok(g.method && g.method.length > 30, g.id);
    const R = getRules(g.country, g.tax_year);
    const known = new Set(R.sources.map((s) => s.id));
    assert.ok(g.source_ids.length > 0, g.id);
    for (const s of g.source_ids) assert.ok(known.has(s), `${g.id}: source "${s}" is not in the ${g.country} ${g.tax_year} rule set`);
    assert.ok(g.checked <= R.lastVerified || g.checked === R.lastVerified, `${g.id}: checked after the rules were last verified`);
  }
  assert.ok(new Set(golden.map((g) => g.country)).size >= 7, 'golden figures cover most countries');
});

for (const g of golden) {
  test(`golden: ${g.id} (${g.source_type})`, () => {
    if (g.call === 'regime_tax') {
      const R = getRules(g.country, g.tax_year);
      for (const [taxable, want] of g.table) {
        const got = regimeTax(R, g.args.regime, taxable, g.args.residency, g.args.age_band)[g.field];
        assert.ok(Math.abs(got - want) <= g.tolerance, `${g.id} @ ${taxable}: ${got} ≠ ${want}`);
      }
      return;
    }
    const out = calculateTax(g.args);
    assert.ok(out.ok, `${g.id}: ${out.error && out.error.message}`);
    assert.equal(out.result.tax_year, g.tax_year, g.id);
    for (const [field, want] of Object.entries(g.expect)) {
      const got = out.result[field];
      assert.ok(Math.abs(got - want) <= g.tolerance, `${g.id}: ${field} ${got} ≠ ${want} (±${g.tolerance})`);
    }
  });
}

/* ---- every bracket table: just below, at and just above each threshold ---- */
/* Independent formulation: tax = Σ (rate_i − rate_{i−1}) × max(0, x − lower_i). */
function reference(x, table) {
  let lower = 0, prevRate = 0, tax = 0;
  for (const [rate, upTo] of table) {
    tax += (rate - prevRate) * Math.max(0, x - lower);
    prevRate = rate; lower = upTo;
  }
  return tax;
}

const isTable = (v) => Array.isArray(v) && v.length > 0 && v.every((b) => Array.isArray(b) && b.length === 2 && typeof b[0] === 'number' && typeof b[1] === 'number') && v[v.length - 1][1] === Infinity;

function collectTables(obj, path, out, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return out;
  seen.add(obj);
  if (isTable(obj)) { out.push([path, obj]); return out; }
  for (const [k, v] of Object.entries(obj)) collectTables(v, `${path}.${k}`, out, seen);
  return out;
}

const TABLES = [];
for (const k of ORDER) for (const y of Object.keys(COUNTRIES[k].rules)) collectTables(COUNTRIES[k].rules[y], `${k}[${y}]`, TABLES);
collectTables(US_STATES, 'US_STATES', TABLES);
collectTables(CA_PROVINCES, 'CA_PROVINCES', TABLES);

test(`found the bracket tables in the rule data (${TABLES.length})`, () => {
  const where = TABLES.map(([p]) => p).join(' ');
  for (const must of ['UK[2026-27].incomeTax.bands', 'US[2026].incomeTax.brackets.single', 'AU[2026-27].incomeTax.brackets', 'IT[2026].incomeTax.brackets', 'IN[2026-27].newRegime.slabs', 'IN[2026-27].oldRegime.slabs.80_plus', 'IE[2026].socialTax.usc.bands']) {
    assert.ok(where.includes(must), `missing ${must}`);
  }
  assert.ok(TABLES.length > 60, 'state and provincial tables are included');
});

test('every bracket table is well-formed: ascending thresholds, rates in [0, 1), open top band', () => {
  for (const [path, t] of TABLES) {
    for (let i = 0; i < t.length; i++) {
      const [rate, upTo] = t[i];
      assert.ok(rate >= 0 && rate < 1, `${path}[${i}] rate ${rate}`);
      if (i > 0) assert.ok(upTo > t[i - 1][1], `${path}[${i}] thresholds must ascend`);
    }
  }
});

test('every threshold of every table: tax just below, at and just above, and the marginal rate on each side', () => {
  let checks = 0;
  for (const [path, t] of TABLES) {
    for (let i = 0; i < t.length - 1; i++) {
      const edge = t[i][1];
      for (const x of [edge - 1, edge, edge + 1]) {
        assert.ok(Math.abs(bracketTax(x, t) - reference(x, t)) < 1e-6, `${path} @ ${x}`);
        checks++;
      }
      const below = bracketTax(edge, t) - bracketTax(edge - 1, t);
      const above = bracketTax(edge + 1, t) - bracketTax(edge, t);
      assert.ok(Math.abs(below - t[i][0]) < 1e-9, `${path}: marginal rate just below ${edge} should be ${t[i][0]}`);
      assert.ok(Math.abs(above - t[i + 1][0]) < 1e-9, `${path}: marginal rate just above ${edge} should be ${t[i + 1][0]}`);
    }
  }
  assert.ok(checks > 500, `only ${checks} edge checks ran`);
});
