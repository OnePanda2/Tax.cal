/* Australia — resident individual income tax, Medicare levy, GST. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'AU', iso: 'AU', name: 'Australia', article: '', flag: '🇦🇺', slug: 'australia',
  currency: { code: 'AUD', symbol: '$', locale: 'en-AU' },
  incomeName: 'Income tax', socialName: 'Medicare levy', consumptionName: 'GST',
  note: 'Resident single, 2026-27 rates (the 15% bracket started 1 July 2026). Superannuation is paid by your employer on top, so it is not counted as your tax here.',
  tips: [
    ['Salary-sacrifice into super', 'Concessional contributions are taxed at 15% instead of your marginal rate — often a large saving up to the yearly cap.'],
    ['Claim your work deductions', 'From 2026-27 a $1,000 standard deduction applies automatically; if your real work expenses are higher, claim them instead.'],
    ['Right-size private health cover', 'The correct level of hospital cover removes the 1–1.5% Medicare Levy Surcharge for higher earners.']
  ]
});

export const RULES = deepFreeze({
  '2026-27': {
    country: 'AU',
    taxYear: '2026-27',
    taxYearLabel: '2026–27 income year (1 July 2026 – 30 June 2027)',
    period: { start: '2026-07-01', end: '2027-06-30' },
    calendarYear: 2026,
    legalBasis: 'Income Tax Rates Act 1986 as amended by the Treasury Laws Amendment (More Cost of Living Relief) Act 2025; Medicare Levy Act 1986',
    currency: 'AUD',
    ruleVersion: 'AU-2026-27-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      brackets: [[0,18200],[.15,45000],[.30,135000],[.37,190000],[.45,INF]],
      standardWorkDeduction: 1000,
      lito: { max: 700, fullTo: 37500, taper1To: 45000, taper1Rate: 0.05, midAmount: 325, taper2To: 66667, taper2Rate: 0.015 }
    },
    socialTax: {
      name: 'Medicare levy',
      rate: 0.02,
      lowIncome: { lower: 28011, upper: 35013, shadeRate: 0.10, thresholdYear: '2025-26' }
    },
    indirectTax: {
      name: 'GST',
      standardRate: 0.10,
      categories: {
        groceries: { effectiveRate: 0.023, nominalRate: 0.0, confidence: 'med', reason: 'Basic food is GST-free; processed food, drinks and household goods carry 10%.' },
        dining: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: '10% GST: one eleventh of a tax-inclusive price.' },
        fuel: { effectiveRate: 0.30, nominalRate: null, confidence: 'med', reason: 'Fuel excise plus GST as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: 'Standard 10% GST.' },
        utilities: { effectiveRate: 0.075, nominalRate: 0.10, confidence: 'med', reason: 'Energy and telecoms carry GST; water and sewerage are largely GST-free.' },
        entertainment: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: 'Standard 10% GST.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Australian resident for tax purposes, full year, single, with only salary and wages.',
      'The new $1,000 standard deduction for work-related expenses (from 2026-27) is applied; no other deductions.',
      'Low Income Tax Offset applied. Medicare levy low-income thresholds for 2026-27 are not yet published, so the 2025-26 thresholds ($28,011 / $35,013) are used.'
    ],
    exclusions: [
      'Medicare Levy Surcharge (depends on private hospital cover).',
      'HELP/HECS study-loan repayments (not a tax).',
      'Superannuation guarantee (paid by the employer on top of salary).',
      'Foreign residents and working-holiday makers.'
    ],
    sources: [
      { id: 'ato-rates', title: 'Tax rates – Australian residents', publisher: 'Australian Taxation Office', url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents', covers: 'Resident brackets' },
      { id: 'ato-new-cuts', title: 'Personal income tax – new tax cuts for every Australian taxpayer', publisher: 'Australian Taxation Office', url: 'https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer', covers: '16% rate cut to 15% from 1 July 2026 (14% from 1 July 2027)' },
      { id: 'ato-lito', title: 'Low income tax offset', publisher: 'Australian Taxation Office', url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset', covers: '$700 maximum; tapers to nil at $66,667' },
      { id: 'ato-medicare-low', title: 'Medicare levy reduction for low-income earners', publisher: 'Australian Taxation Office', url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners', covers: '2025-26 single thresholds $28,011 / $35,013' },
      { id: 'ato-standard-deduction', title: 'Standard deduction for work-related expenses', publisher: 'Australian Taxation Office', url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/work-related-deductions/standard-deduction-for-work-related-expenses', covers: 'Up to $1,000 from 2026-27, applied automatically' }
    ]
  }
});

export const DEFAULT_YEAR = '2026-27';
