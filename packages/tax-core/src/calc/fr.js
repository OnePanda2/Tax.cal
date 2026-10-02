import { bracketTax, pos } from '../util.js';

/* French private-sector non-cadre employee, one tax part. */
export function calcFR(R, input) {
  const y = input.gross;
  const S = R.socialTax;
  const t1 = Math.min(y, S.pss);
  const t2 = Math.min(pos(y - S.pss), 7 * S.pss);

  const oldAge = t1 * S.oldAgeCapped + y * S.oldAgeUncapped;
  const complementary = t1 * (S.agircT1 + S.cegT1) + t2 * (S.agircT2 + S.cegT2) + (y > S.pss ? (t1 + t2) * S.cet : 0);
  const csgBase = Math.min(y, S.csg.baseShareCapPss * S.pss) * S.csg.baseShare + pos(y - S.csg.baseShareCapPss * S.pss);
  const csg = csgBase * S.csg.rate;
  const crds = csgBase * S.crds;
  const social = oldAge + complementary + csg + crds;

  // Net taxable salary: everything except the non-deductible CSG and CRDS.
  const deductible = oldAge + complementary + csgBase * S.csg.deductibleRate;
  const netTaxable = pos(y - deductible);
  const A = R.incomeTax.professionalAllowance;
  const allowance = netTaxable > 0 ? Math.min(Math.max(netTaxable * A.rate, Math.min(A.min, netTaxable)), A.max) : 0;
  const taxable = pos(netTaxable - allowance);

  const brut = bracketTax(taxable / R.incomeTax.parts, R.incomeTax.bareme) * R.incomeTax.parts;
  const D = R.incomeTax.decote;
  const decote = brut > 0 && brut < D.threshold ? Math.min(brut, pos(D.base - brut * D.rate)) : 0;
  const incomeTax = pos(brut - decote);

  return {
    taxableIncome: taxable,
    incomeTax, social, regional: 0,
    lines: [
      { key: 'net_taxable_salary', label: 'Net taxable salary', amount: netTaxable, kind: 'info' },
      { key: 'professional_allowance', label: '10% professional-expenses allowance', amount: allowance, kind: 'deduction' },
      { key: 'income_tax_gross', label: 'Income tax before décote', amount: brut, kind: 'info' },
      { key: 'decote', label: 'Décote', amount: -decote, kind: 'credit' },
      { key: 'income_tax', label: 'Income tax (impôt sur le revenu)', amount: incomeTax, kind: 'income_tax' },
      { key: 'old_age', label: 'Old-age insurance (6.90% capped + 0.40%)', amount: oldAge, kind: 'social' },
      { key: 'complementary_pension', label: 'Agirc-Arrco complementary pension + CEG/CET', amount: complementary, kind: 'social' },
      { key: 'csg', label: 'CSG (9.2% on 98.25%)', amount: csg, kind: 'social' },
      { key: 'crds', label: 'CRDS (0.5% on 98.25%)', amount: crds, kind: 'social' }
    ],
    notes: []
  };
}
