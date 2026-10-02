import { bracketTax, pos } from '../util.js';

/* Australian resident: income tax − LITO, plus the Medicare levy. */
export function calcAU(R, input) {
  const y = input.gross;
  const it = R.incomeTax;
  const deduction = Math.min(it.standardWorkDeduction, y);
  const taxable = pos(y - deduction);
  const gross = bracketTax(taxable, it.brackets);

  const L = it.lito;
  let lito = 0;
  if (taxable <= L.fullTo) lito = L.max;
  else if (taxable <= L.taper1To) lito = L.max - (taxable - L.fullTo) * L.taper1Rate;
  else if (taxable <= L.taper2To) lito = L.midAmount - (taxable - L.taper1To) * L.taper2Rate;
  lito = pos(lito);
  const incomeTax = pos(gross - lito);   // LITO is non-refundable

  const M = R.socialTax;
  let medicare;
  if (taxable <= M.lowIncome.lower) medicare = 0;
  else if (taxable <= M.lowIncome.upper) medicare = (taxable - M.lowIncome.lower) * M.lowIncome.shadeRate;
  else medicare = taxable * M.rate;

  return {
    taxableIncome: taxable,
    incomeTax, social: medicare, regional: 0,
    lines: [
      { key: 'standard_work_deduction', label: 'Standard deduction for work-related expenses', amount: deduction, kind: 'deduction' },
      { key: 'income_tax_before_offsets', label: 'Income tax before offsets', amount: gross, kind: 'info' },
      { key: 'lito', label: 'Low Income Tax Offset', amount: -Math.min(lito, gross), kind: 'credit' },
      { key: 'income_tax', label: 'Income tax', amount: incomeTax, kind: 'income_tax' },
      { key: 'medicare_levy', label: 'Medicare levy', amount: medicare, kind: 'social' }
    ],
    notes: []
  };
}
