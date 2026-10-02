/* Canada — federal and provincial income tax, CPP/QPP, EI and QPIP. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'CA', iso: 'CA', name: 'Canada', article: '', flag: '🇨🇦', slug: 'canada',
  currency: { code: 'CAD', symbol: '$', locale: 'en-CA' },
  incomeName: 'Income tax (federal + provincial)', socialName: 'CPP + EI', consumptionName: 'Sales tax',
  regionType: 'province', regionLabel: 'Province', regionDefault: 'ON',
  note: 'Provincial income tax and combined GST/HST/PST vary by the province you pick. Quebec uses QPP, QPIP and the federal abatement.',
  tips: [
    ['Max your RRSP', 'Contributions come straight off your taxable income at your marginal rate — the biggest legal lever in Canada.'],
    ['Use a TFSA', 'Not a deduction, but everything inside grows and comes out completely tax-free, for life.'],
    ['Open an FHSA', 'The First Home Savings Account is deductible going in and tax-free coming out — RRSP and TFSA benefits combined.']
  ]
});

/* Provinces and territories: 2026 brackets, basic personal amount and the
   combined GST/HST/PST rate (%). The first bracket rate is the provincial
   credit rate. Parameters as at January 2026 (CRA T4127, 122nd edition). */
export const CA_PROVINCES = deepFreeze({
  AB: { name: 'Alberta',                   sales: 5,      bpa: 22769, income: { b: [[.08,61200],[.10,154259],[.12,185111],[.13,246813],[.14,370220],[.15,INF]] } },
  BC: { name: 'British Columbia',          sales: 12,     bpa: 13216, income: { b: [[.056,50363],[.077,100728],[.105,115648],[.1229,140430],[.147,190405],[.168,265545],[.205,INF]] } },
  MB: { name: 'Manitoba',                  sales: 12,     bpa: 15780, income: { b: [[.108,47000],[.1275,100000],[.174,INF]] } },
  NB: { name: 'New Brunswick',             sales: 15,     bpa: 13664, income: { b: [[.094,52333],[.14,104666],[.16,193861],[.195,INF]] } },
  NL: { name: 'Newfoundland and Labrador', sales: 15,     bpa: 13094, income: { b: [[.087,44678],[.145,89354],[.158,159528],[.178,223340],[.198,285319],[.208,570638],[.213,1141275],[.218,INF]] } },
  NS: { name: 'Nova Scotia',               sales: 15,     bpa: 11932, income: { b: [[.0879,30995],[.1495,61991],[.1667,97417],[.175,157124],[.21,INF]] } },
  NT: { name: 'Northwest Territories',     sales: 5,      bpa: 18198, income: { b: [[.059,53003],[.086,106009],[.122,172346],[.1405,INF]] } },
  NU: { name: 'Nunavut',                   sales: 5,      bpa: 19659, income: { b: [[.04,55801],[.07,111602],[.09,181439],[.115,INF]] } },
  ON: { name: 'Ontario',                   sales: 13,     bpa: 12989, income: { b: [[.0505,53891],[.0915,107785],[.1116,150000],[.1216,220000],[.1316,INF]] } },
  PE: { name: 'Prince Edward Island',      sales: 15,     bpa: 15000, income: { b: [[.095,33928],[.1347,65820],[.166,106890],[.1762,142520],[.19,200000],[.20,INF]] } },
  QC: { name: 'Quebec',                    sales: 14.975, bpa: 18952, income: { b: [[.14,54345],[.19,108680],[.24,132245],[.2575,INF]] } },
  SK: { name: 'Saskatchewan',              sales: 11,     bpa: 20381, income: { b: [[.105,54532],[.125,155805],[.145,INF]] } },
  YT: { name: 'Yukon',                     sales: 5,      bpa: 16452, income: { b: [[.064,58523],[.09,117045],[.109,181440],[.128,500000],[.15,INF]] } }
});

export const RULES = deepFreeze({
  '2026': {
    country: 'CA',
    taxYear: '2026',
    taxYearLabel: 'Tax year 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Income Tax Act (Canada), Canada Pension Plan, Employment Insurance Act; provincial income tax acts; Quebec Taxation Act and QPP/QPIP rules — parameters from CRA T4127 (January 2026) and Revenu Québec',
    currency: 'CAD',
    ruleVersion: 'CA-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      federalBrackets: [[.14,58523],[.205,117045],[.26,181440],[.29,258482],[.33,INF]],
      creditRate: 0.14,
      basicPersonalAmount: { max: 16452, min: 14829, phaseOutStart: 181440, phaseOutEnd: 258482 },
      canadaEmploymentAmount: 1501,
      quebecAbatement: 0.165
    },
    socialTax: {
      cpp: { rate: 0.0595, baseRate: 0.0495, ympe: 74600, basicExemption: 3500, cpp2Rate: 0.04, yampe: 85000 },
      qpp: { rate: 0.063, baseRate: 0.053, ympe: 74600, basicExemption: 3500, qpp2Rate: 0.04, yampe: 85000 },
      ei: { rate: 0.0163, quebecRate: 0.013, maxInsurable: 68900 },
      qpip: { rate: 0.0043, maxInsurable: 103000 }
    },
    regionalTax: {
      ontario: {
        surtax: [[0.20, 5818], [0.36, 7446]],   // % of basic Ontario tax above each threshold
        healthPremium: [                         // [from, to, base, rate, cap] on taxable income
          [20000, 36000, 0, 0.06, 300],
          [36000, 48000, 300, 0.06, 450],
          [48000, 72000, 450, 0.25, 600],
          [72000, 200000, 600, 0.25, 750],
          [200000, INF, 750, 0.25, 900]
        ]
      },
      basis: 'Provincial tax = provincial brackets minus credits at the lowest provincial rate for the basic personal amount, CPP/QPP base contributions and EI (and QPIP in Quebec). Ontario adds its surtax and Health Premium.'
    },
    indirectTax: {
      name: 'Sales tax',
      model: 'regional-sales-tax',
      categories: {
        groceries: { taxableShare: 0.15, confidence: 'low', reason: 'Basic groceries are zero-rated for GST/HST; snacks, soft drinks and household goods are not.' },
        dining: { taxableShare: 1.0, confidence: 'high', reason: 'Restaurant meals carry GST/HST (and PST where it applies).' },
        fuel: { effectiveRate: 0.30, confidence: 'med', reason: 'Federal and provincial fuel excise plus GST/HST, as a rough share of the pump price.' },
        shopping: { taxableShare: 0.95, confidence: 'high', reason: 'General merchandise is taxable.' },
        utilities: { taxableShare: 0.45, confidence: 'med', reason: 'Some provinces relieve PST on home energy; phone and internet are taxable.' },
        entertainment: { taxableShare: 0.70, confidence: 'med', reason: 'Most subscriptions and admissions are taxable.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'medium', indirect_tax: 'medium' },
    assumptions: [
      'Single employee aged 18–64 with only employment income, no RRSP/FHSA contributions and no dependants.',
      'Federal non-refundable credits: basic personal amount, Canada employment amount, base CPP/QPP contributions and EI/QPIP premiums. The enhanced CPP/QPP contributions are deducted from income.',
      'Provincial credits for the basic personal amount and CPP/EI at the lowest provincial rate.'
    ],
    exclusions: [
      'Provincial low-income tax reductions (e.g. the Ontario tax reduction, BC tax reduction) and other provincial credits.',
      'Quebec-specific deductions such as the deduction for workers; Quebec tax is approximated with the same credit method.',
      'Mid-year 2026 provincial changes announced after January 2026 (BC, Newfoundland and Labrador, PEI) are not fully reflected.',
      'Refundable credits and benefits (GST/HST credit, Canada Workers Benefit).'
    ],
    sources: [
      { id: 'cra-t4127-122', title: 'Payroll Deductions Formulas — 122nd Edition, effective January 1, 2026 (T4127)', publisher: 'Canada Revenue Agency', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html', covers: 'Federal brackets (14% …), BPA $16,452, Canada employment amount $1,501, CPP/EI, provincial brackets, Ontario surtax and Health Premium' },
      { id: 'cra-t4127-123', title: 'Payroll Deductions Formulas — 123rd Edition, effective July 1, 2026 (T4127)', publisher: 'Canada Revenue Agency', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html', covers: 'Mid-year provincial changes (BC, NL, PEI)' },
      { id: 'esdc-ei-2026', title: 'Summary of the 2026 Actuarial Report on the Employment Insurance Premium Rate', publisher: 'Employment and Social Development Canada', url: 'https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/reports/premium/rates2026.html', covers: 'EI premium rate 1.63% (1.30% in Quebec) and maximum insurable earnings' },
      { id: 'rq-2026', title: 'Employers: Principal Changes for 2026', publisher: 'Revenu Québec', url: 'https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/employers-principal-changes-for-2026/', covers: 'QPP 6.30% to $74,600, QPIP 0.430% to $103,000, Quebec abatement 16.5%' },
      { id: 'sales-tax-rates', title: 'GST/HST and provincial sales tax rates', publisher: 'Canada Revenue Agency and provincial governments (compiled by Tax.cal)', url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html', covers: 'Combined GST/HST/PST rate per province' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
