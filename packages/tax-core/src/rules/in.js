/* India — individual income tax on salary, for two rule sets that must never
   be mixed:

     '2026-27'  Tax Year 2026-27 (1 Apr 2026 – 31 Mar 2027), Income-tax Act, 2025
     '2025-26'  FY 2025-26 = AY 2026-27 (legacy), Income-tax Act, 1961

   The amounts are the same in both years (Budget 2026 changed no personal
   rates); the law, the section numbers and the terminology are not. Every
   Indian number in Tax.cal lives in this file. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'IN', iso: 'IN', name: 'India', article: '', flag: '🇮🇳', slug: 'india',
  currency: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  incomeName: 'Income tax (incl. surcharge & cess)', socialName: null, consumptionName: 'GST',
  note: 'Resident salaried individual, Tax Year 2026-27 under the Income-tax Act, 2025. New regime by default; compare it with the old regime below. EPF and state professional tax are not included.',
  tips: [
    ['Compare both regimes every year', 'Salaried employees can choose the old regime when filing. It only wins if your deductions (80C, 80D, HRA, home-loan interest…) are large.'],
    ['Employer NPS works in both regimes', 'Your employer’s NPS contribution (up to 14% of basic pay in the new regime) is deductible even when other deductions are not.'],
    ['Watch the ₹12 lakh line', 'Under the new regime a salary up to ₹12.75 lakh pays no income tax; just above it, marginal relief stops the tax jumping.']
  ]
});

const SOURCES_COMMON = [
  { id: 'it-act-2025', title: 'Income-tax Act, 2025 (30 of 2025) as amended by the Finance Act, 2026', publisher: 'Income Tax Department, Government of India', url: 'https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf', covers: '§19 standard deduction, §123/Schedule XV and §126 deductions, §156 rebate, §202 new regime' },
  { id: 'itd-s202', title: 'Section 202 — Income-tax Act, 2025', publisher: 'Income Tax Department', url: 'https://www.incometaxindia.gov.in/w/section-202-76', covers: 'New-regime slabs: nil to ₹4 lakh, then 5/10/15/20/25/30%' },
  { id: 'itd-s156', title: 'Section 156 — Rebate of income-tax in case of certain individuals', publisher: 'Income Tax Department', url: 'https://www.incometaxindia.gov.in/w/section-156-84', covers: '₹60,000 up to ₹12 lakh (new regime) with marginal relief; ₹12,500 up to ₹5 lakh (old regime); residents only' },
  { id: 'itd-s19', title: 'Section 19 — Deductions from salaries', publisher: 'Income Tax Department', url: 'https://www.incometaxindia.gov.in/w/section-19-206', covers: 'Standard deduction ₹75,000 (§202) / ₹50,000 (otherwise)' },
  { id: 'finance-act-2026', title: 'The Finance Act, 2026 — First Schedule', publisher: 'Ministry of Law and Justice (Gazette of India)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf', covers: 'Old-regime slabs (₹2.5L / ₹3L / ₹5L exemption by age), surcharge 10/15/25/37% with marginal relief (37% not for §202), Health and Education Cess 4%' },
  { id: 'itd-transition-faq', title: 'FAQs on Interplay and Transition to the Income-tax Act, 2025', publisher: 'Income Tax Department', url: 'https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf', covers: 'FY 2025-26 income is assessed in AY 2026-27 under the 1961 Act; Tax Year 2026-27 is a separate obligation under the 2025 Act' },
  { id: 'pib-budget-2026', title: 'Summary of Union Budget 2026-27', publisher: 'Press Information Bureau', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2221458&reg=3&lang=2', covers: 'Income-tax Act, 2025 in force from 1 April 2026; no change to personal slabs' },
  { id: 'pib-12-lakh', title: 'No income tax on annual income up to Rs. 12 lakh under new tax regime', publisher: 'Press Information Bureau', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406&reg=48&lang=2', covers: 'Slab table and ₹12.75 lakh for salaried taxpayers (worked figures used in tests)' }
];

const SOURCES_INDIRECT = [
  { id: 'gst-56th-council', title: 'Recommendations of the 56th Meeting of the GST Council', publisher: 'Press Information Bureau / GST Council', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555&reg=48&lang=2', covers: 'Two-slab GST (5% and 18%, 40% special) from 22 September 2025; staples nil; most packaged food 5%' },
  { id: 'gst-faq-56', title: 'FAQs on the decisions of the 56th GST Council', publisher: 'Press Information Bureau', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163560&reg=3&lang=2', covers: 'Apparel and footwear up to ₹2,500 at 5%; gyms, salons 5%; TVs and ACs 18%' },
  { id: 'cbic-gst-rates-faq', title: 'GST Rates FAQs', publisher: 'Central Board of Indirect Taxes and Customs', url: 'https://cbic-gst.gov.in/gst-rates-faq.html', covers: 'Restaurant services 5% without input tax credit; electricity exempt' },
  { id: 'ppac-excise', title: 'Central Excise and Customs Rate on Major Petroleum Products', publisher: 'Petroleum Planning & Analysis Cell (PPAC)', url: 'https://ppac.gov.in/prices/central-excise-and-customs-rate-on-major-petroleum-products', covers: 'Petrol central excise ₹11.90/litre after the ₹10 cut of 27 March 2026' },
  { id: 'ppac-vat', title: 'VAT/Sales Tax/GST Rates on petroleum products', publisher: 'Petroleum Planning & Analysis Cell (PPAC)', url: 'https://ppac.gov.in/prices/vat-sales-tax-gst-rates', covers: 'Delhi VAT on petrol 19.40% (on price including dealer commission)' },
  { id: 'ppac-rsp', title: 'Retail selling price of petrol, Delhi (as on 1 October 2026: ₹102.12/litre)', publisher: 'Petroleum Planning & Analysis Cell (PPAC)', url: 'https://ppac.gov.in/', covers: 'Pump price used for the fuel-tax share' },
  { id: 'pib-excise-cut-2026', title: 'Government Slashes Excise Duty on Petrol and Diesel to Shield Consumers and OMCs from Global Oil Shock', publisher: 'Press Information Bureau', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245970&lang=1&reg=3', covers: '₹10/litre excise cut from 27 March 2026' }
];

/* Fuel tax share: (central excise + Delhi VAT) / pump price, Oct 2026.
   VAT is levied on the price including excise and dealer commission, so the
   VAT inside a tax-inclusive price is RSP × 0.194 / 1.194. */
const PETROL = { rsp: 102.12, excise: 11.90, vatRate: 0.194 };
const PETROL_TAX_SHARE = (PETROL.excise + PETROL.rsp * PETROL.vatRate / (1 + PETROL.vatRate)) / PETROL.rsp;

const GST_CATEGORIES = {
  groceries: { effectiveRate: 0.019, nominalRate: 0.05, confidence: 'low', reason: 'Fresh produce, milk and unbranded staples are nil-rated; most packaged food is 5% since GST 2.0. Assumes 60% nil and 40% at 5% (5/105 of a tax-inclusive price).' },
  dining: { effectiveRate: 0.0476, nominalRate: 0.05, confidence: 'high', reason: 'Stand-alone restaurants charge 5% GST without input tax credit (5/105 of the bill). Restaurants in hotels with room tariffs above ₹7,500 charge 18%.' },
  fuel: { effectiveRate: Math.round(PETROL_TAX_SHARE * 1000) / 1000, nominalRate: null, confidence: 'low', reason: 'Petrol is outside GST. Central excise (₹11.90/l after the March 2026 cut) plus Delhi VAT (19.40%) is about 28% of the Delhi pump price (₹102.12/l, 1 Oct 2026). States with higher VAT take more.' },
  shopping: { effectiveRate: 0.10, nominalRate: null, confidence: 'med', reason: 'Clothing and footwear up to ₹2,500 per item and many daily goods are 5%; electronics, cosmetics and pricier clothing are 18%. Assumes half of each (≈10% of a tax-inclusive bill).' },
  utilities: { effectiveRate: 0.055, nominalRate: null, confidence: 'low', reason: 'Electricity is GST-exempt (state electricity duty varies and is left out); phone/internet carry 18% and LPG 5%. Assumes 50% electricity, 30% telecoms, 20% LPG.' },
  entertainment: { effectiveRate: 0.1315, nominalRate: 0.18, confidence: 'med', reason: 'Streaming, apps and most entertainment carry 18%; gyms and cinema tickets up to ₹100 carry 5%. Assumes 80% at 18%, 20% at 5%.' }
};

/* The parameters common to both years. */
const PARAMS = {
  newRegime: {
    slabs: [[0, 400000], [0.05, 800000], [0.10, 1200000], [0.15, 1600000], [0.20, 2000000], [0.25, 2400000], [0.30, INF]],
    standardDeduction: 75000,
    rebate: { maxIncome: 1200000, maxRebate: 60000, marginalRelief: true },
    surcharge: [[5000000, 0.10], [10000000, 0.15], [20000000, 0.25]]
  },
  oldRegime: {
    slabs: {
      below_60: [[0, 250000], [0.05, 500000], [0.20, 1000000], [0.30, INF]],
      '60_to_79': [[0, 300000], [0.05, 500000], [0.20, 1000000], [0.30, INF]],
      '80_plus': [[0, 500000], [0.20, 1000000], [0.30, INF]]
    },
    standardDeduction: 50000,
    rebate: { maxIncome: 500000, maxRebate: 12500, marginalRelief: false },
    surcharge: [[5000000, 0.10], [10000000, 0.15], [20000000, 0.25], [50000000, 0.37]],
    deductionCaps: {
      section_80c: 150000,            // §123 + Schedule XV (2025 Act) / §80C (1961 Act)
      section_80ccd_1b: 50000,        // additional own NPS contribution
      section_80d: 100000,            // §126 / §80D: up to 25k/50k self + 25k/50k parents
      home_loan_interest: 200000,     // self-occupied property
      hra_exemption: null,            // computed by the user/employer; cannot exceed salary
      other: null
    }
  },
  cess: 0.04,
  rebateResidentsOnly: true,
  seniorBandsResidentsOnly: true
};

const SCOPE = {
  supported: [
    'Individual taxpayer, resident or non-resident, with salary income',
    'New regime (default) and old regime, with a side-by-side comparison',
    'Standard deduction, rebate with marginal relief, surcharge with marginal relief, 4% cess',
    'Old-regime deductions entered by the user (80C/§123, 80D/§126, 80CCD(1B), home-loan interest, HRA exemption, other)'
  ],
  unsupported: [
    'Business or professional income, presumptive taxation',
    'Capital gains and special-rate income (rebate interplay not modelled)',
    'HUF, firms, companies, trusts, AOP/BOI',
    'Foreign income, foreign assets, DTAA relief',
    'TDS/TCS computation, GST filing, return (ITR) preparation or filing'
  ]
};

const COMMON_ASSUMPTIONS = [
  'Gross annual salary from one employer; no other income.',
  'Resident individual below 60 unless stated. The new regime is the default; the old regime applies only if chosen.',
  'No employer NPS, perquisites, or exempt allowances other than an HRA exemption you enter for the old regime.',
  'Figures are not rounded to the nearest ₹10 the way a return is.'
];

const COMMON_EXCLUSIONS = [
  'Employee Provident Fund (EPF) contributions — retirement savings, not tax (they still reduce take-home pay).',
  'State professional tax (up to ₹2,500 a year; nil in some states such as Delhi).',
  'ESI contributions (only for wages up to ₹21,000 a month at covered employers).',
  'Business/professional income, capital gains, HUF, foreign income and assets, TDS, GST filing, ITR preparation.'
];

const INDIRECT = {
  name: 'GST',
  standardRate: 0.18,
  categories: GST_CATEGORIES,
  basis: 'GST 2.0 rates in force since 22 September 2025; petrol taxes per PPAC/IOCL for Delhi, 1 October 2026.'
};

export const RULES = deepFreeze({
  '2026-27': {
    country: 'IN',
    taxYear: '2026-27',
    taxYearLabel: 'Tax Year 2026-27 (1 April 2026 – 31 March 2027) under the Income-tax Act, 2025',
    terminology: 'tax_year',
    period: { start: '2026-04-01', end: '2027-03-31' },
    calendarYear: 2026,
    legalBasis: 'Income-tax Act, 2025 (as amended by the Finance Act, 2026): §19, §156, §202; rates of surcharge and cess per the Finance Act, 2026',
    sections: { newRegime: 'section 202', rebate: 'section 156', standardDeduction: 'section 19', investments: 'section 123 read with Schedule XV', healthInsurance: 'section 126' },
    currency: 'INR',
    ruleVersion: 'IN-2026-27-v1',
    lastVerified: '2026-10-02',
    status: 'current',
    ...PARAMS,
    indirectTax: INDIRECT,
    scope: SCOPE,
    confidence: { direct_tax: 'high', social_contributions: 'not_applicable', regional_tax: 'not_applicable', indirect_tax: 'low' },
    assumptions: COMMON_ASSUMPTIONS,
    exclusions: COMMON_EXCLUSIONS,
    sources: [...SOURCES_COMMON, ...SOURCES_INDIRECT]
  },
  '2025-26': {
    country: 'IN',
    taxYear: '2025-26',
    taxYearLabel: 'FY 2025-26 (AY 2026-27) under the Income-tax Act, 1961 — legacy year',
    terminology: 'previous_year',
    assessmentYear: '2026-27',
    period: { start: '2025-04-01', end: '2026-03-31' },
    calendarYear: 2025,
    legalBasis: 'Income-tax Act, 1961 as amended by the Finance Act, 2025: §16(ia), §87A, §115BAC(1A); surcharge and cess per the Finance Act, 2025',
    sections: { newRegime: 'section 115BAC(1A)', rebate: 'section 87A', standardDeduction: 'section 16(ia)', investments: 'section 80C', healthInsurance: 'section 80D' },
    currency: 'INR',
    ruleVersion: 'IN-2025-26-legacy-v1',
    lastVerified: '2026-10-02',
    status: 'legacy',
    ...PARAMS,
    indirectTax: INDIRECT,
    scope: SCOPE,
    confidence: { direct_tax: 'high', social_contributions: 'not_applicable', regional_tax: 'not_applicable', indirect_tax: 'low' },
    assumptions: COMMON_ASSUMPTIONS,
    exclusions: COMMON_EXCLUSIONS,
    sources: [
      { id: 'finance-act-2025-highlights', title: 'Key Highlights of Finance Act, 2025', publisher: 'Income Tax Department', url: 'https://www.incometaxindia.gov.in/documents/20117/14614782/%E2%80%8BKey-Highlights-of-Finance-Act-2025.pdf/139e2679-ed0a-9470-7277-23d5d6244b9f', covers: '115BAC slabs from AY 2026-27, §87A rebate ₹60,000 up to ₹12 lakh, standard deduction ₹75,000' },
      SOURCES_COMMON[5], SOURCES_COMMON[7],
      ...SOURCES_INDIRECT
    ]
  }
});

export const DEFAULT_YEAR = '2026-27';

/* How Indian year labels map onto the two rule sets. Used by validation so
   that "AY 2026-27" is never silently treated as Tax Year 2026-27. */
export const YEAR_ALIASES = deepFreeze({
  '2026-27': { year: '2026-27', note: null },
  'TY 2026-27': { year: '2026-27', note: null },
  'TAX YEAR 2026-27': { year: '2026-27', note: null },
  'FY 2026-27': { year: '2026-27', note: 'FY 2026-27 is Tax Year 2026-27 under the Income-tax Act, 2025 (the term "financial year" is replaced by "tax year").' },
  'AY 2027-28': { year: '2026-27', note: 'There is no AY 2027-28 under the Income-tax Act, 2025: income from 1 April 2026 is taxed for Tax Year 2026-27.' },
  '2025-26': { year: '2025-26', note: 'Interpreted as FY 2025-26 (AY 2026-27) under the Income-tax Act, 1961.' },
  'FY 2025-26': { year: '2025-26', note: 'FY 2025-26 is assessed in AY 2026-27 under the Income-tax Act, 1961.' },
  'AY 2026-27': { year: '2025-26', note: 'AY 2026-27 covers income earned in FY 2025-26 (1 April 2025 – 31 March 2026), taxed under the Income-tax Act, 1961 — not Tax Year 2026-27.' }
});
