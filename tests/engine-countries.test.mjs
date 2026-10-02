/* Golden values for every country, computed by hand from the cited rules,
   including just-below / at / just-above every important threshold. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDirect, deTariff, getRules } from '../packages/tax-core/src/index.js';
import { labourCredit, generalCredit } from '../packages/tax-core/src/calc/nl.js';
import { workIncomeReduction } from '../packages/tax-core/src/calc/es.js';
import { employeeCredit, cuneoCredit } from '../packages/tax-core/src/calc/it.js';
import { close, line } from './helpers.mjs';

const d = (key, gross, opts = {}) => runDirect(key, gross, opts);

test('UK: personal allowance, band and NI edges (2026/27)', () => {
  for (const [y, it, ni] of [
    [0, 0, 0], [12569, 0, 0], [12570, 0, 0], [12571, 0.2, 0.08],
    [50269, 7539.8, 3015.92], [50270, 7540, 3016], [50271, 7540.4, 3016.02],
    [100000, 27432, 4010.6], [100002, 27433.2, 4010.64],
    [125140, 42516, 4513.4], [125141, 42516.45, 4513.42]
  ]) {
    const r = d('UK', y).calc;
    close(r.incomeTax, it, 0.005, `UK IT ${y}`);
    close(r.social, ni, 0.005, `UK NI ${y}`);
  }
});

test('UK: £45,000 example is unchanged (£6,486 + £2,594.40)', () => {
  const r = d('UK', 45000).calc;
  close(r.incomeTax, 6486); close(r.social, 2594.4);
});

test('US: federal standard deduction, first bracket, SS wage base and Additional Medicare edges', () => {
  close(d('US', 16100, { status: 'single' }).calc.incomeTax, 0);
  close(d('US', 16101, { status: 'single' }).calc.incomeTax, 0.1);
  close(d('US', 28500, { status: 'single' }).calc.incomeTax, 1240);
  close(d('US', 28501, { status: 'single' }).calc.incomeTax, 1240.12);
  close(d('US', 32200, { status: 'mfj' }).calc.incomeTax, 0);
  close(d('US', 57000, { status: 'mfj' }).calc.incomeTax, 2480);   // 24,800 × 10%
  const at = d('US', 184500, { status: 'single' }).calc, above = d('US', 184501, { status: 'single' }).calc;
  close(line(at, 'social_security'), 11439); close(line(above, 'social_security'), 11439);
  assert.ok(!d('US', 200000, { status: 'single' }).calc.lines.some((l) => l.key === 'additional_medicare'));
  close(line(d('US', 200001, { status: 'single' }).calc, 'additional_medicare'), 0.009);
  assert.ok(!d('US', 250000, { status: 'mfj' }).calc.lines.some((l) => l.key === 'additional_medicare'));
});

test('US: $120,000 single in California (federal $17,570, CA $6,770.86, FICA+SDI $10,740)', () => {
  const r = d('US', 120000, { status: 'single', region: 'CA' });
  close(r.calc.incomeTax, 17570); close(r.calc.regional, 6770.86); close(r.calc.social, 10740);
  assert.equal(r.confidence.regional_tax, 'medium');
  const tx = d('US', 120000, { status: 'single', region: 'TX' });
  close(tx.calc.regional, 0); assert.equal(tx.confidence.regional_tax, 'high');
  assert.equal(d('US', 120000, { status: 'single', region: 'NY' }).confidence.regional_tax, 'low');
});

test('US: California standard deduction edge and joint brackets are double the single ones', () => {
  close(d('US', 5900, { status: 'single', region: 'CA' }).calc.regional, 0);
  const R = getRules('US').regionalTax.california;
  R.brackets.single.forEach(([rate, t], i) => {
    const [r2, t2] = R.brackets.mfj[i];
    assert.equal(rate, r2);
    assert.equal(t2, t === Infinity ? Infinity : t * 2);
  });
});

test('Canada: CPP and EI maximums, CPP2, Ontario and Quebec at $75,000', () => {
  const on = d('CA', 75000, { region: 'ON' }).calc;
  close(line(on, 'cpp'), 4230.45 + 16); close(line(on, 'ei'), 1123.07);
  close(on.incomeTax, 8258.6, 0.01); close(on.regional, 4446.06, 0.01);
  close(line(on, 'ontario_health_premium'), 750);
  const qc = d('CA', 75000, { region: 'QC' }).calc;
  close(qc.social, 5713.5, 0.01); close(qc.incomeTax, 6855.72, 0.01); close(qc.regional, 8043.23, 0.01);
  close(line(qc, 'quebec_abatement'), -1354.72, 0.01);
  // EI and CPP stop at their maximums
  close(line(d('CA', 68901, { region: 'AB' }).calc, 'ei'), 1123.07);
  close(line(d('CA', 90000, { region: 'AB' }).calc, 'cpp'), 4230.45 + 416);
});

test('Canada: Ontario surtax kicks in above $5,818 of basic Ontario tax', () => {
  const r = d('CA', 250000, { region: 'ON' }).calc;
  assert.ok(line(r, 'ontario_surtax') > 0);
  assert.ok(!d('CA', 60000, { region: 'ON' }).calc.lines.some((l) => l.key === 'ontario_surtax'));
});

test('Australia 2026-27: tax-free threshold, LITO, Medicare low-income shading', () => {
  close(d('AU', 19200).calc.incomeTax, 0);                 // taxable 18,200
  close(d('AU', 23866).calc.incomeTax, 0);                 // 699.90 of tax, cancelled by LITO
  close(d('AU', 23867).calc.incomeTax, 0.05);
  close(d('AU', 29011).calc.social, 0);                    // taxable 28,011
  close(d('AU', 29012).calc.social, 0.1);
  close(d('AU', 36013).calc.social, 700.2);                // taxable 35,013, shading
  close(d('AU', 36014).calc.social, 700.28);               // 2% of 35,014
  const r = d('AU', 90000).calc;                           // taxable 89,000
  close(r.incomeTax, 17220); close(r.social, 1780);
});

test('Ireland 2026: credits, band edge, USC exemption, PRSI threshold and blend', () => {
  close(d('IE', 44000).calc.incomeTax, 4800); close(d('IE', 44001).calc.incomeTax, 4800.4);
  close(line(d('IE', 13000).calc, 'usc'), 0);
  close(line(d('IE', 13001).calc, 'usc'), 79.84);
  close(line(d('IE', 52 * 352).calc, 'prsi'), 0);          // at the weekly threshold
  close(line(d('IE', 50000).calc, 'prsi'), 2118.75);       // 4.2% × 9/12 + 4.35% × 3/12
  close(d('IE', 50000).calc.incomeTax, 7200);
});

test('Germany 2026: §32a tariff at every zone boundary (statutory formula, floored)', () => {
  const T = getRules('DE').incomeTax.tariff;
  for (const [x, t] of [[12348, 0], [12349, 0], [17799, 1034], [17800, 1035], [69878, 18213], [69879, 18213], [277825, 105550], [277826, 105551]]) {
    assert.equal(deTariff(x, T), t, `zvE ${x}`);
  }
});

test('Germany 2026: €55,000 single, childless (zvE €42,679 → €8,070 income tax; €11,962.50 social)', () => {
  const r = d('DE', 55000).calc;
  close(r.taxableIncome, 42679, 0.5); close(r.incomeTax, 8070); close(r.social, 11962.5);
  const kids = d('DE', 55000, { childless: false }).calc;
  close(kids.social, 11632.5);
});

test('Germany 2026: contribution ceilings €69,750 and €101,400; solidarity surcharge Freigrenze', () => {
  const a = d('DE', 69750).calc, b = d('DE', 80000).calc;
  close(line(a, 'health_insurance'), line(b, 'health_insurance'));
  close(line(d('DE', 101400).calc, 'pension_insurance'), 9430.2);
  close(line(d('DE', 150000).calc, 'pension_insurance'), 9430.2);
  close(line(d('DE', 70000).calc, 'solidarity_surcharge'), 0);
  assert.ok(line(d('DE', 150000).calc, 'solidarity_surcharge') > 0);
});

test('France: €45,000 non-cadre (net taxable €36,904.05 → IR €3,068.08; contributions €9,378.11)', () => {
  const r = d('FR', 45000).calc;
  close(line(r, 'net_taxable_salary'), 36904.05, 0.01); close(r.incomeTax, 3068.08, 0.01); close(r.social, 9378.11, 0.01);
});

test('France: décote applies below €1,982 of tax and the barème starts at €11,600', () => {
  const low = d('FR', 18000).calc;
  assert.ok(line(low, 'decote') < 0);
  close(d('FR', 12000).calc.incomeTax, 0);
});

test('Netherlands 2026: credit segments are continuous and match the published table', () => {
  const LC = getRules('NL').incomeTax.labourCredit, GC = getRules('NL').incomeTax.generalCredit;
  close(labourCredit(11965, LC), 995.97, 0.01);
  close(labourCredit(25845, LC), 5300.05, 0.01);
  close(labourCredit(45592, LC), 5685.07, 0.01);
  close(labourCredit(132920, LC), 0, 0.01);
  close(generalCredit(29736, GC), 3115);
  close(generalCredit(78426, GC), 0, 0.5);
  close(d('NL', 50000).calc.incomeTax, 10859.67, 0.01);
});

test('Spain 2026: work-income reduction tapers continuously; €40,000 example', () => {
  const W = getRules('ES').incomeTax.workIncomeReduction;
  close(workIncomeReduction(14852, W), 7302);
  close(workIncomeReduction(17673.52, W), 2364.34, 0.01);
  close(workIncomeReduction(19747.5, W), 0, 0.01);
  const r = d('ES', 40000).calc;
  close(r.social, 2600); close(r.incomeTax, 7745);
  close(d('ES', 18000).calc.incomeTax, 375.82, 0.01);
  close(line(d('ES', 70000).calc, 'social_security'), 61214.4 * 0.065, 0.01);   // capped at the base máxima
});

test('Italy 2026: statutory employee and cuneo credits; €35,000 example', () => {
  const E = getRules('IT').incomeTax.employeeCredit, C = getRules('IT').incomeTax.cuneoCredit;
  close(employeeCredit(15000, E), 1955);
  close(employeeCredit(28000, E), 1910 + 65);   // +€65 applies between €25,000 and €35,000
  close(employeeCredit(50000, E), 0);
  close(employeeCredit(30000, E), 1910 * 20000 / 22000 + 65, 0.01);
  close(cuneoCredit(20000, C), 0); close(cuneoCredit(20001, C), 1000); close(cuneoCredit(36000, C), 500); close(cuneoCredit(40000, C), 0);
  const r = d('IT', 35000).calc;
  close(r.social, 3216.5); close(r.incomeTax, 5042.03, 0.01); close(r.regional, 709.24, 0.01);
});

test('zero and negative-free inputs: every country returns zero tax at zero income', () => {
  for (const k of ['UK', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'IN']) {
    const r = d(k, 0, { status: 'single', region: k === 'US' ? 'CA' : k === 'CA' ? 'ON' : null });
    close(r.direct.total, 0, 0.005, k);
  }
});

test('very high incomes stay finite and below 100% for every country', () => {
  for (const k of ['UK', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'IN']) {
    const y = k === 'IN' ? 1e10 : 1e8;
    const r = d(k, y, { status: 'single', region: k === 'US' ? 'CA' : k === 'CA' ? 'QC' : null });
    assert.ok(Number.isFinite(r.direct.total) && r.direct.total > 0 && r.direct.total < y, k);
  }
});
