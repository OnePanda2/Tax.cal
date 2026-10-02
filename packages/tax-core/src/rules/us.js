/* United States — federal income tax, FICA, and state income tax.
   California is modelled from its own 2026 rate schedule; every other state
   uses a deliberately simple proxy that is labelled as such in every result. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'US', iso: 'US', name: 'United States', article: 'the', flag: '🇺🇸', slug: 'usa',
  currency: { code: 'USD', symbol: '$', locale: 'en-US' },
  incomeName: 'Federal income tax', socialName: 'Social Security + Medicare (FICA)', consumptionName: 'Sales tax',
  regionType: 'state', regionLabel: 'State', regionDefault: 'CA',
  note: 'State income tax and state + local sales tax vary by the state you pick. Local city taxes (e.g. NYC) are not included.',
  tips: [
    ['Max your 401(k)', 'Traditional contributions cut your federal — and usually state — taxable income, up to the yearly IRS limit.'],
    ['Open an HSA if you can', 'With an HSA-eligible health plan it is triple tax-free: deductible in, grows tax-free, tax-free out for medical costs.'],
    ['Your state is doing a lot of this', 'Nine states take no income tax at all. Check the country comparison — the same salary in TX or FL keeps much more.']
  ]
});

/* State income-tax model + combined average state & local sales-tax rate (%).
   income: {t:'none'} | {t:'flat', r} | {t:'grad', b:[[rate, upTo], ...]}
   These tables are single-filer schedules compiled in September 2026 and are
   applied through a PROXY (see `stateProxy` below). */
export const US_STATES = deepFreeze({
  AL: { name: 'Alabama',        sales: 9.46, income: { t: 'grad', b: [[.02,500],[.04,3000],[.05,INF]] } },
  AK: { name: 'Alaska',         sales: 1.82, income: { t: 'none' } },
  AZ: { name: 'Arizona',        sales: 8.54, income: { t: 'flat', r: .025 } },
  AR: { name: 'Arkansas',       sales: 9.48, income: { t: 'grad', b: [[.02,4600],[.039,INF]] } },
  CA: { name: 'California',     sales: 9.03, income: { t: 'grad', b: [[.01,11079],[.02,26264],[.04,41452],[.06,57542],[.08,72724],[.093,371479],[.103,445771],[.113,742953],[.123,1000000],[.133,INF]] } },
  CO: { name: 'Colorado',       sales: 7.89, income: { t: 'flat', r: .044 } },
  CT: { name: 'Connecticut',    sales: 6.35, income: { t: 'grad', b: [[.02,10000],[.045,50000],[.055,100000],[.06,200000],[.065,250000],[.069,500000],[.0699,INF]] } },
  DE: { name: 'Delaware',       sales: 0.00, income: { t: 'grad', b: [[.022,5000],[.039,10000],[.048,20000],[.052,25000],[.0555,60000],[.066,INF]] } },
  FL: { name: 'Florida',        sales: 6.98, income: { t: 'none' } },
  GA: { name: 'Georgia',        sales: 7.56, income: { t: 'flat', r: .0519 } },
  HI: { name: 'Hawaii',         sales: 4.50, income: { t: 'grad', b: [[.014,9600],[.032,14400],[.055,19200],[.064,24000],[.068,36000],[.072,48000],[.076,125000],[.079,175000],[.0825,225000],[.09,275000],[.10,325000],[.11,INF]] } },
  ID: { name: 'Idaho',          sales: 6.03, income: { t: 'flat', r: .053 } },
  IL: { name: 'Illinois',       sales: 8.98, income: { t: 'flat', r: .0495 } },
  IN: { name: 'Indiana',        sales: 7.00, income: { t: 'flat', r: .0295 } },
  IA: { name: 'Iowa',           sales: 6.94, income: { t: 'flat', r: .038 } },
  KS: { name: 'Kansas',         sales: 8.71, income: { t: 'grad', b: [[.052,23000],[.0558,INF]] } },
  KY: { name: 'Kentucky',       sales: 6.00, income: { t: 'flat', r: .035 } },
  LA: { name: 'Louisiana',      sales: 10.13, income: { t: 'flat', r: .03 } },
  ME: { name: 'Maine',          sales: 5.50, income: { t: 'grad', b: [[.058,27399],[.0675,64849],[.0715,INF]] } },
  MD: { name: 'Maryland',       sales: 6.00, income: { t: 'grad', b: [[.02,1000],[.03,2000],[.04,3000],[.0475,100000],[.05,125000],[.0525,150000],[.055,250000],[.0575,500000],[.0625,1000000],[.065,INF]] } },
  MA: { name: 'Massachusetts',  sales: 6.25, income: { t: 'grad', b: [[.05,1083150],[.09,INF]] } },
  MI: { name: 'Michigan',       sales: 6.00, income: { t: 'flat', r: .0425 } },
  MN: { name: 'Minnesota',      sales: 8.14, income: { t: 'grad', b: [[.0535,33310],[.068,109430],[.0785,203150],[.0985,INF]] } },
  MS: { name: 'Mississippi',    sales: 7.06, income: { t: 'flat', r: .04 } },
  MO: { name: 'Missouri',       sales: 8.44, income: { t: 'grad', b: [[.02,2696],[.025,4044],[.03,5392],[.035,6740],[.04,8088],[.045,9436],[.047,INF]] } },
  MT: { name: 'Montana',        sales: 0.00, income: { t: 'grad', b: [[.047,47500],[.0565,INF]] } },
  NE: { name: 'Nebraska',       sales: 6.98, income: { t: 'grad', b: [[.0246,4130],[.0351,24760],[.0455,INF]] } },
  NV: { name: 'Nevada',         sales: 8.24, income: { t: 'none' } },
  NH: { name: 'New Hampshire',  sales: 0.00, income: { t: 'none' } },  /* no tax on wages */
  NJ: { name: 'New Jersey',     sales: 6.60, income: { t: 'grad', b: [[.014,20000],[.0175,35000],[.035,40000],[.0553,75000],[.0637,500000],[.0897,1000000],[.1075,INF]] } },
  NM: { name: 'New Mexico',     sales: 7.68, income: { t: 'grad', b: [[.015,5500],[.032,16500],[.043,33500],[.047,66500],[.049,210000],[.059,INF]] } },
  NY: { name: 'New York',       sales: 8.54, income: { t: 'grad', b: [[.039,8500],[.044,11700],[.0515,13900],[.054,80650],[.059,215400],[.0685,1077550],[.0965,5000000],[.103,25000000],[.109,INF]] } },
  NC: { name: 'North Carolina', sales: 7.10, income: { t: 'flat', r: .0399 } },
  ND: { name: 'North Dakota',   sales: 7.09, income: { t: 'grad', b: [[.0195,244825],[.025,INF]] } },
  OH: { name: 'Ohio',           sales: 7.29, income: { t: 'flat', r: .0275 } },
  OK: { name: 'Oklahoma',       sales: 9.06, income: { t: 'grad', b: [[.025,4900],[.035,7200],[.045,INF]] } },
  OR: { name: 'Oregon',         sales: 0.00, income: { t: 'grad', b: [[.0475,4550],[.0675,11400],[.0875,125000],[.099,INF]] } },
  PA: { name: 'Pennsylvania',   sales: 6.34, income: { t: 'flat', r: .0307 } },
  RI: { name: 'Rhode Island',   sales: 7.00, income: { t: 'grad', b: [[.0375,82050],[.0475,186450],[.0599,INF]] } },
  SC: { name: 'South Carolina', sales: 7.49, income: { t: 'grad', b: [[0,3640],[.03,18230],[.06,INF]] } },
  SD: { name: 'South Dakota',   sales: 6.11, income: { t: 'none' } },
  TN: { name: 'Tennessee',      sales: 9.61, income: { t: 'none' } },
  TX: { name: 'Texas',          sales: 8.20, income: { t: 'none' } },
  UT: { name: 'Utah',           sales: 7.42, income: { t: 'flat', r: .045 } },
  VT: { name: 'Vermont',        sales: 6.43, income: { t: 'grad', b: [[.0335,49400],[.066,119700],[.076,249700],[.0875,INF]] } },
  VA: { name: 'Virginia',       sales: 5.77, income: { t: 'grad', b: [[.02,3000],[.03,5000],[.05,17000],[.0575,INF]] } },
  WA: { name: 'Washington',     sales: 9.57, income: { t: 'none' } },  /* 7% is capital-gains only, not wages */
  WV: { name: 'West Virginia',  sales: 6.60, income: { t: 'grad', b: [[.0222,10000],[.0296,25000],[.0333,40000],[.0444,60000],[.0482,INF]] } },
  WI: { name: 'Wisconsin',      sales: 5.72, income: { t: 'grad', b: [[.035,15110],[.044,51950],[.053,332720],[.0765,INF]] } },
  WY: { name: 'Wyoming',        sales: 5.39, income: { t: 'none' } },
  DC: { name: 'District of Columbia', sales: 6.00, income: { t: 'grad', b: [[.04,10000],[.06,40000],[.065,60000],[.085,250000],[.0925,500000],[.0975,1000000],[.1075,INF]] } }
});

const CA_SINGLE = [[.01,11456],[.02,27157],[.04,42861],[.06,59498],[.08,75197],[.093,384109],[.103,460927],[.113,768213],[.123,INF]];
const CA_JOINT = CA_SINGLE.map(([r, t]) => [r, t === INF ? INF : t * 2]);

export const RULES = deepFreeze({
  '2026': {
    country: 'US',
    taxYear: '2026',
    taxYearLabel: 'Tax year 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Internal Revenue Code as amended by Public Law 119-21 (the One, Big, Beautiful Bill Act); 2026 inflation adjustments in Rev. Proc. 2025-32',
    currency: 'USD',
    ruleVersion: 'US-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    filingStatuses: ['single', 'mfj'],
    incomeTax: {
      standardDeduction: { single: 16100, mfj: 32200 },
      brackets: {
        single: [[.10,12400],[.12,50400],[.22,105700],[.24,201775],[.32,256225],[.35,640600],[.37,INF]],
        mfj:    [[.10,24800],[.12,100800],[.22,211400],[.24,403550],[.32,512450],[.35,768700],[.37,INF]]
      }
    },
    socialTax: {
      socialSecurityRate: 0.062, socialSecurityWageBase: 184500,
      medicareRate: 0.0145,
      additionalMedicareRate: 0.009, additionalMedicareThreshold: { single: 200000, mfj: 250000 }
    },
    regionalTax: {
      california: {
        taxYear: '2026',
        standardDeduction: { single: 5900, mfj: 11800 },
        brackets: { single: CA_SINGLE, mfj: CA_JOINT },
        exemptionCredit: { single: 158, mfj: 316 },
        mentalHealthServicesTax: { rate: 0.01, threshold: 1000000 },
        sdiRate: 0.013,
        basis: '2026 schedules: thresholds indexed by the 3.4% California CPI announced by the FTB; exemption credit derived from the 2025 amount ($153/$306) at the same rate.'
      },
      stateProxy: 'For states other than California the state taxable income is approximated by federal taxable income (wages minus the federal standard deduction) and the state’s single-filer schedule is applied, including for joint filers. State exemptions, credits and local income taxes are not modelled.'
    },
    indirectTax: {
      name: 'Sales tax',
      model: 'regional-sales-tax',
      /* Share of each category that bears sales tax (many states exempt
         groceries; services are often untaxed). Fuel carries per-gallon excise
         instead, as a rough fixed share of the pump price. */
      categories: {
        groceries: { taxableShare: 0.25, confidence: 'low', reason: 'Most states exempt or reduce groceries; Tax.cal assumes a quarter of a grocery bill bears the full state + local rate.' },
        dining: { taxableShare: 1.0, confidence: 'high', reason: 'Restaurant meals are taxable in every state with a sales tax.' },
        fuel: { effectiveRate: 0.16, confidence: 'med', reason: 'Federal (18.4¢/gal) plus state excise, as a rough share of the pump price.' },
        shopping: { taxableShare: 0.95, confidence: 'high', reason: 'General merchandise is taxable; a few states exempt clothing.' },
        utilities: { taxableShare: 0.40, confidence: 'med', reason: 'Utility taxation varies widely by state; a blended taxable share.' },
        entertainment: { taxableShare: 0.70, confidence: 'med', reason: 'Digital subscriptions and admissions are taxed in some states but not others.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'low', indirect_tax: 'low' },
    assumptions: [
      'A single wage earner. For married filing jointly, all wages belong to one spouse (relevant to the Social Security wage base).',
      'Standard deduction only — no itemised deductions, pre-tax 401(k)/HSA contributions, tips/overtime deductions or tax credits.',
      'Under age 65 (the 2025–2028 senior deduction is not applied).'
    ],
    exclusions: [
      'Head of household and married filing separately statuses.',
      'Local and city income taxes (e.g. New York City, Philadelphia).',
      'State disability or family-leave payroll contributions outside California.',
      'Alternative Minimum Tax, net investment income tax, credits (Child Tax Credit, EITC).',
      'Property tax.'
    ],
    sources: [
      { id: 'irs-2026', title: 'IRS releases tax inflation adjustments for tax year 2026, including amendments from the One, Big, Beautiful Bill', publisher: 'Internal Revenue Service', url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill', covers: 'Standard deduction $16,100 / $32,200 and 2026 bracket thresholds' },
      { id: 'irs-rp-2025-32', title: 'Revenue Procedure 2025-32', publisher: 'Internal Revenue Service', url: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf', covers: '2026 tax rate tables' },
      { id: 'ssa-cola-2026', title: '2026 Cost-of-Living Adjustment (COLA) Fact Sheet', publisher: 'Social Security Administration', url: 'https://www.ssa.gov/news/en/cola/factsheets/2026.html', covers: 'Social Security wage base $184,500; 6.2% and 1.45% rates' },
      { id: 'irs-addl-medicare', title: 'Questions and answers for the Additional Medicare Tax', publisher: 'Internal Revenue Service', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/questions-and-answers-for-the-additional-medicare-tax', covers: '0.9% above $200,000 (single) / $250,000 (joint)' },
      { id: 'ftb-tax-news', title: 'Tax News (2026 indexing of California tax rates)', publisher: 'California Franchise Tax Board', url: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html', covers: '3.4% California CPI indexation for 2026; standard deduction $5,900' },
      { id: 'edd-2026-withholding', title: 'California Withholding Schedules for 2026', publisher: 'California Employment Development Department', url: 'https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf', covers: '2026 California rate schedule thresholds' },
      { id: 'edd-sdi-2026', title: 'Contribution Rates, Withholding Schedules, and Meals and Lodging Values', publisher: 'California Employment Development Department', url: 'https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/', covers: 'SDI 1.3% on all wages in 2026 (no wage limit since 2024)' },
      { id: 'ftb-540-2025', title: '2025 Personal Income Tax Booklet (Form 540)', publisher: 'California Franchise Tax Board', url: 'https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html', covers: '2025 personal exemption credit $153 / $306' },
      { id: 'state-tables', title: 'State income-tax schedules and combined state + local sales-tax averages', publisher: 'Compiled by Tax.cal from state revenue departments and the Tax Foundation (September 2026)', url: null, covers: 'Single-filer state schedules and average sales-tax rates for the other 49 states + DC (secondary compilation)' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
