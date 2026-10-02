import { bracketTax, pos } from '../util.js';

export const REGIMES = ['new', 'old'];
export const AGE_BANDS = ['below_60', '60_to_79', '80_plus'];
export const RESIDENCY = ['resident', 'non_resident'];
export const OLD_DEDUCTION_KEYS = ['section_80c', 'section_80ccd_1b', 'section_80d', 'home_loan_interest', 'hra_exemption', 'other'];

/* Slab table for a regime. Higher old-regime exemption limits are for
   resident senior citizens only; non-residents use the general table. */
export function slabsFor(R, regime, residency, ageBand) {
  if (regime === 'new') return R.newRegime.slabs;
  const band = residency === 'resident' && R.seniorBandsResidentsOnly ? (ageBand || 'below_60') : 'below_60';
  return R.oldRegime.slabs[band] || R.oldRegime.slabs.below_60;
}

/* Cap each old-regime deduction at its statutory limit (and the total at the
   income it is deducted from). Returns what was allowed, item by item. */
export function capOldDeductions(deductions, caps, incomeAfterSD) {
  const items = [];
  let total = 0;
  for (const key of OLD_DEDUCTION_KEYS) {
    const claimed = Math.max(0, Number(deductions && deductions[key]) || 0);
    if (!claimed) continue;
    const cap = caps[key];
    const allowed = cap == null ? claimed : Math.min(claimed, cap);
    items.push({ key, claimed, allowed, cap });
    total += allowed;
  }
  const limited = Math.min(total, incomeAfterSD);
  return { total: limited, items, limitedByIncome: limited < total };
}

/* Surcharge band for a total income: rate, the threshold that triggered it
   and the rate of the band below (for marginal relief). */
export function surchargeBand(taxable, bands) {
  let rate = 0, threshold = 0, prevRate = 0;
  for (const [thr, r] of bands) {
    if (taxable > thr) { prevRate = rate; rate = r; threshold = thr; }
  }
  return { rate, threshold, prevRate };
}

/* Income tax on `taxable` under one regime: slab tax → rebate (with marginal
   relief) → surcharge (with marginal relief) → 4% cess. Pure function. */
export function regimeTax(R, regime, taxable, residency, ageBand) {
  const P = regime === 'new' ? R.newRegime : R.oldRegime;
  const slabs = slabsFor(R, regime, residency, ageBand);
  const slabTax = bracketTax(taxable, slabs);

  let rebate = 0;
  let rebateMarginalRelief = false;
  if (residency === 'resident') {
    const rb = P.rebate;
    if (taxable <= rb.maxIncome) {
      rebate = Math.min(slabTax, rb.maxRebate);
    } else if (rb.marginalRelief && slabTax > taxable - rb.maxIncome) {
      // §156(2)(b) / §87A proviso: tax may not exceed the income above ₹12 lakh.
      rebate = slabTax - (taxable - rb.maxIncome);
      rebateMarginalRelief = true;
    }
  }
  const taxAfterRebate = pos(slabTax - rebate);

  const band = surchargeBand(taxable, P.surcharge);
  let surcharge = taxAfterRebate * band.rate;
  let surchargeRelief = 0;
  if (band.rate > 0) {
    // Tax + surcharge may not exceed the tax + surcharge at the threshold by
    // more than the income above the threshold.
    const atThreshold = bracketTax(band.threshold, slabs) * (1 + band.prevRate);
    const cap = atThreshold + (taxable - band.threshold);
    surchargeRelief = pos(taxAfterRebate + surcharge - cap);
    surcharge = pos(surcharge - surchargeRelief);
  }
  const cess = (taxAfterRebate + surcharge) * R.cess;
  const total = taxAfterRebate + surcharge + cess;

  return {
    regime, taxable, slabTax, rebate, rebateMarginalRelief,
    taxAfterRebate, surchargeRate: band.rate, surcharge, surchargeRelief,
    cess, total
  };
}

/* Salary → taxable income → tax, for one regime. */
export function regimeFromSalary(R, regime, input) {
  const salary = input.gross;
  const P = regime === 'new' ? R.newRegime : R.oldRegime;
  const sd = Math.min(P.standardDeduction, salary);
  let ded = { total: 0, items: [], limitedByIncome: false };
  if (regime === 'old') ded = capOldDeductions(input.deductions, R.oldRegime.deductionCaps, pos(salary - sd));
  const taxable = pos(salary - sd - ded.total);
  const t = regimeTax(R, regime, taxable, input.residency || 'resident', input.ageBand || 'below_60');
  return { ...t, salary, standardDeduction: sd, deductions: ded };
}

function linesFor(R, t) {
  const sec = R.sections;
  const lines = [
    { key: 'standard_deduction', label: `Standard deduction (${sec.standardDeduction})`, amount: t.standardDeduction, kind: 'deduction' }
  ];
  if (t.regime === 'old' && t.deductions.total) {
    lines.push({ key: 'old_regime_deductions', label: 'Old-regime deductions allowed', amount: t.deductions.total, kind: 'deduction' });
  }
  lines.push(
    { key: 'taxable_income', label: 'Total (taxable) income', amount: t.taxable, kind: 'info' },
    { key: 'tax_on_slabs', label: `Tax on slabs (${t.regime === 'new' ? sec.newRegime : 'old regime'})`, amount: t.slabTax, kind: 'info' },
    { key: 'rebate', label: `Rebate (${sec.rebate})${t.rebateMarginalRelief ? ' incl. marginal relief' : ''}`, amount: -t.rebate, kind: 'credit' },
    { key: 'surcharge', label: t.surchargeRate ? `Surcharge (${Math.round(t.surchargeRate * 100)}%${t.surchargeRelief ? ', after marginal relief' : ''})` : 'Surcharge', amount: t.surcharge, kind: 'income_tax' },
    { key: 'cess', label: 'Health and Education Cess (4%)', amount: t.cess, kind: 'income_tax' },
    { key: 'income_tax', label: 'Income tax payable', amount: t.total, kind: 'income_tax' }
  );
  return lines;
}

/* India: one regime as the headline result, the other computed alongside so
   every caller can show the comparison. */
export function calcIN(R, input) {
  const regime = input.regime === 'old' ? 'old' : 'new';
  const chosen = regimeFromSalary(R, regime, input);
  const other = regimeFromSalary(R, regime === 'new' ? 'old' : 'new', input);
  const notes = [];
  if (input.residency === 'non_resident') notes.push('Non-residents get no section 156 / 87A rebate and no higher senior-citizen exemption limits.');
  if (chosen.rebateMarginalRelief) notes.push('Marginal relief applies: tax is limited to the income above ₹12 lakh.');
  if (chosen.surchargeRelief > 0) notes.push('Marginal relief on surcharge applies at the ₹' + (chosen.surchargeRate === 0.10 ? '50 lakh' : chosen.surchargeRate === 0.15 ? '1 crore' : chosen.surchargeRate === 0.25 ? '2 crore' : '5 crore') + ' threshold.');
  if (chosen.deductions.limitedByIncome) notes.push('Old-regime deductions were limited to the income they are deducted from.');
  return {
    taxableIncome: chosen.taxable,
    incomeTax: chosen.total, social: 0, regional: 0,
    lines: linesFor(R, chosen),
    notes,
    details: { regime, chosen, other }
  };
}

/* Total old-regime deductions at which old-regime tax equals new-regime tax
   (bisection; old-regime tax falls as deductions rise). Null if even
   deducting the whole salary cannot match, or if the new regime is already
   higher with no deductions. */
export function breakevenDeductions(R, input) {
  const target = regimeFromSalary(R, 'new', input).total;
  const oldAt = (d) => regimeFromSalary(R, 'old', { ...input, deductions: { other: d } }).total;
  if (oldAt(0) <= target) return 0;
  let lo = 0, hi = Math.max(0, input.gross);
  if (oldAt(hi) > target) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (oldAt(mid) > target) lo = mid; else hi = mid;
  }
  return Math.ceil(hi);
}
