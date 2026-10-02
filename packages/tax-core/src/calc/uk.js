import { bracketTax, pos } from '../util.js';

/* UK income tax + Class 1 employee NI for one employee (rest of UK). */
export function calcUK(R, input) {
  const y = input.gross;
  const it = R.incomeTax;
  const pa = y > it.taperStart ? pos(it.personalAllowance - (y - it.taperStart) / 2) : it.personalAllowance;
  const taxable = pos(y - pa);
  // Bands apply to TAXABLE income, so a tapered allowance does not widen the
  // basic-rate band (the v18 engine got this wrong above £100,000).
  const incomeTax = bracketTax(taxable, it.bands);

  const ni = R.socialTax;
  const social = pos(Math.min(y, ni.upperEarningsLimit) - ni.primaryThreshold) * ni.mainRate
    + pos(y - ni.upperEarningsLimit) * ni.upperRate;

  return {
    taxableIncome: taxable,
    incomeTax, social, regional: 0,
    lines: [
      { key: 'personal_allowance', label: 'Personal allowance', amount: pa, kind: 'deduction' },
      { key: 'income_tax', label: 'Income tax', amount: incomeTax, kind: 'income_tax' },
      { key: 'national_insurance', label: 'National Insurance (Class 1)', amount: social, kind: 'social' }
    ],
    notes: y > it.taperStart ? ['Personal allowance reduced by £1 for every £2 above £100,000.'] : []
  };
}
