import { bracketTax, pos } from '../util.js';
import { CA_PROVINCES } from '../rules/ca.js';

/* Federal + provincial income tax and CPP/QPP, EI, QPIP for one employee. */
export function calcCA(R, input) {
  const y = input.gross;
  const prov = CA_PROVINCES[input.region] ? input.region : 'ON';
  const P = CA_PROVINCES[prov];
  const isQC = prov === 'QC';
  const S = R.socialTax;
  const it = R.incomeTax;

  // Pension plan (CPP or QPP): first tier + second tier.
  const plan = isQC ? S.qpp : S.cpp;
  const pensionable = pos(Math.min(y, plan.ympe) - plan.basicExemption);
  const tier1 = pensionable * plan.rate;
  const tier1Base = pensionable * plan.baseRate;          // credit-eligible part
  const tier1Enhanced = tier1 - tier1Base;                // deductible part
  const tier2 = pos(Math.min(y, plan.yampe) - plan.ympe) * (isQC ? plan.qpp2Rate : plan.cpp2Rate);

  const ei = Math.min(y, S.ei.maxInsurable) * (isQC ? S.ei.quebecRate : S.ei.rate);
  const qpip = isQC ? Math.min(y, S.qpip.maxInsurable) * S.qpip.rate : 0;

  const social = tier1 + tier2 + ei + qpip;
  const taxable = pos(y - tier1Enhanced - tier2);

  // Federal: brackets − credits at 14%.
  const bpaF = it.basicPersonalAmount;
  const bpa = taxable <= bpaF.phaseOutStart ? bpaF.max
    : taxable >= bpaF.phaseOutEnd ? bpaF.min
    : bpaF.max - (bpaF.max - bpaF.min) * (taxable - bpaF.phaseOutStart) / (bpaF.phaseOutEnd - bpaF.phaseOutStart);
  const cea = Math.min(it.canadaEmploymentAmount, y);
  const fedCredits = (bpa + cea + tier1Base + ei + qpip) * it.creditRate;
  let federal = pos(bracketTax(taxable, it.federalBrackets) - fedCredits);
  let abatement = 0;
  if (isQC) { abatement = federal * it.quebecAbatement; federal -= abatement; }

  // Provincial: brackets − credits at the lowest provincial rate.
  const lowRate = P.income.b[0][0];
  const basicProv = pos(bracketTax(taxable, P.income.b) - (P.bpa + tier1Base + ei + qpip) * lowRate);
  let provincial = basicProv;
  let surtax = 0, ohp = 0;
  if (prov === 'ON') {
    const O = R.regionalTax.ontario;
    surtax = O.surtax.reduce((t, [rate, thr]) => t + pos(basicProv - thr) * rate, 0);
    for (const [from, to, base, rate, cap] of O.healthPremium) {
      if (taxable > from && taxable <= to) { ohp = Math.min(cap, base + (taxable - from) * rate); break; }
    }
    provincial += surtax + ohp;
  }

  const lines = [
    { key: 'federal_income_tax', label: 'Federal income tax', amount: federal, kind: 'income_tax' },
    { key: 'provincial_income_tax', label: P.name + ' income tax', amount: basicProv, kind: 'regional' }
  ];
  if (isQC) lines.push({ key: 'quebec_abatement', label: 'Quebec abatement (16.5% of federal tax)', amount: -abatement, kind: 'credit' });
  if (surtax) lines.push({ key: 'ontario_surtax', label: 'Ontario surtax', amount: surtax, kind: 'regional' });
  if (ohp) lines.push({ key: 'ontario_health_premium', label: 'Ontario Health Premium', amount: ohp, kind: 'regional' });
  lines.push({ key: isQC ? 'qpp' : 'cpp', label: isQC ? 'QPP contributions' : 'CPP contributions', amount: tier1 + tier2, kind: 'social' });
  lines.push({ key: 'ei', label: 'Employment Insurance premiums', amount: ei, kind: 'social' });
  if (isQC) lines.push({ key: 'qpip', label: 'QPIP premiums', amount: qpip, kind: 'social' });

  return {
    taxableIncome: taxable,
    incomeTax: federal, social, regional: provincial,
    region: prov,
    lines,
    notes: isQC ? ['Quebec provincial tax is approximated with the same credit method as other provinces.'] : []
  };
}
