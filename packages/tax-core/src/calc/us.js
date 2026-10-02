import { bracketTax, pos } from '../util.js';
import { US_STATES } from '../rules/us.js';

function stateProxyTax(y, stateKey, fedStd) {
  const st = US_STATES[stateKey];
  if (!st) return 0;
  const inc = st.income;
  if (inc.t === 'none') return 0;
  const base = pos(y - fedStd); // proxy for state taxable income
  if (inc.t === 'flat') return base * inc.r;
  return bracketTax(base, inc.b, 0);
}

/* Federal income tax, FICA and (optionally) state income tax.
   input.status: 'single' | 'mfj'; input.region: state code or null. */
export function calcUS(R, input) {
  const y = input.gross;
  const status = input.status === 'mfj' ? 'mfj' : 'single';
  const std = R.incomeTax.standardDeduction[status];
  const taxable = pos(y - std);
  const federal = bracketTax(taxable, R.incomeTax.brackets[status]);

  const s = R.socialTax;
  const ss = Math.min(y, s.socialSecurityWageBase) * s.socialSecurityRate;
  const medicare = y * s.medicareRate;
  const addl = pos(y - s.additionalMedicareThreshold[status]) * s.additionalMedicareRate;

  const lines = [
    { key: 'standard_deduction', label: 'Federal standard deduction', amount: Math.min(std, y), kind: 'deduction' },
    { key: 'federal_income_tax', label: 'Federal income tax', amount: federal, kind: 'income_tax' },
    { key: 'social_security', label: 'Social Security (6.2%)', amount: ss, kind: 'social' },
    { key: 'medicare', label: 'Medicare (1.45%)', amount: medicare, kind: 'social' }
  ];
  if (addl > 0) lines.push({ key: 'additional_medicare', label: 'Additional Medicare Tax (0.9%)', amount: addl, kind: 'social' });

  let social = ss + medicare + addl;
  let regional = 0;
  let regionalConfidence = 'not_applicable';
  const notes = [];
  const region = input.region || null;

  if (region === 'CA') {
    const C = R.regionalTax.california;
    const caTaxable = pos(y - C.standardDeduction[status]);
    const base = bracketTax(caTaxable, C.brackets[status]);
    const mhs = pos(caTaxable - C.mentalHealthServicesTax.threshold) * C.mentalHealthServicesTax.rate;
    regional = pos(base - C.exemptionCredit[status]) + mhs;
    const sdi = y * C.sdiRate;
    social += sdi;
    lines.push({ key: 'state_income_tax', label: 'California income tax', amount: regional, kind: 'regional' });
    lines.push({ key: 'ca_sdi', label: 'California SDI (1.3%)', amount: sdi, kind: 'social' });
    regionalConfidence = 'medium';
    notes.push('California tax uses the 2026 rate schedule, standard deduction and personal exemption credit; SDI is included as a state payroll contribution.');
  } else if (region) {
    regional = stateProxyTax(y, region, std);
    const none = US_STATES[region] && US_STATES[region].income.t === 'none';
    regionalConfidence = none ? 'high' : 'low';
    lines.push({ key: 'state_income_tax', label: (US_STATES[region] ? US_STATES[region].name : region) + ' income tax', amount: regional, kind: 'regional' });
    if (!none) notes.push('State income tax is a proxy: federal taxable income stands in for state taxable income and the single-filer schedule is used.');
  }

  return {
    taxableIncome: taxable,
    incomeTax: federal, social, regional,
    lines, notes,
    confidence: { regional_tax: regionalConfidence }
  };
}

export { stateProxyTax };
