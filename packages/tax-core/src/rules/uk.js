/* United Kingdom — rules for England, Wales and Northern Ireland.
   Scotland sets its own income-tax bands and is not modelled. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'UK', iso: 'GB', name: 'United Kingdom', article: 'the', flag: '🇬🇧', slug: 'uk',
  currency: { code: 'GBP', symbol: '£', locale: 'en-GB' },
  incomeName: 'Income tax', socialName: 'National Insurance', consumptionName: 'VAT',
  note: 'Bands shown are for England, Wales & Northern Ireland. Scotland uses different income-tax bands.',
  tips: [
    ['Pay your pension by salary sacrifice', 'Contributions come out before both Income Tax and National Insurance — a rare double saving most employers offer.'],
    ['Use your £20,000 ISA allowance', 'Not a deduction, but everything inside grows and pays out completely tax-free, for life.'],
    ['Higher-rate earner? Reclaim the 40%', 'Pension contributions and Gift Aid let you claim back higher-rate relief through your tax return.']
  ]
});

export const RULES = deepFreeze({
  '2026-27': {
    country: 'UK',
    taxYear: '2026-27',
    taxYearLabel: '2026/27 tax year (6 April 2026 – 5 April 2027)',
    period: { start: '2026-04-06', end: '2027-04-05' },
    calendarYear: 2026,
    legalBasis: 'Income Tax Act 2007 and annual Finance Acts; Social Security Contributions and Benefits Act 1992 (rates and thresholds as published by HMRC for 2026 to 2027)',
    currency: 'GBP',
    ruleVersion: 'UK-2026-27-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      personalAllowance: 12570,
      taperStart: 100000,           // allowance falls by £1 for every £2 above this
      bands: [[0.20, 37700], [0.40, 125140], [0.45, INF]],  // over TAXABLE income
      basis: 'Tax on taxable income (gross pay minus the personal allowance).'
    },
    socialTax: {
      name: 'Class 1 employee National Insurance',
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.08,
      upperRate: 0.02
    },
    indirectTax: {
      name: 'VAT',
      standardRate: 0.20,
      categories: {
        groceries: { effectiveRate: 0.033, nominalRate: 0.0, confidence: 'low', reason: 'Most food sold in a supermarket is not standard-rated in the UK. This small figure is Tax.cal’s assumption about the rest of a typical trolley — household goods, confectionery, alcohol.' },
        dining: { effectiveRate: 0.1667, nominalRate: 0.20, confidence: 'high', reason: 'Standard-rated. On a price that already includes 20% VAT, the tax is one sixth of what you hand over.' },
        fuel: { effectiveRate: 0.55, nominalRate: null, confidence: 'med', reason: 'The largest single assumption: fuel duty, plus VAT charged on top of it. It is a share of the pump price, not a published rate, and pump prices move.' },
        shopping: { effectiveRate: 0.158, nominalRate: 0.20, confidence: 'med', reason: 'Mostly standard-rated, but not all of it — so Tax.cal uses a little under one sixth.' },
        utilities: { effectiveRate: 0.10, nominalRate: null, confidence: 'med', reason: 'Domestic energy is not charged at the standard rate; other bills generally are. This is a blend.' },
        entertainment: { effectiveRate: 0.1667, nominalRate: 0.20, confidence: 'high', reason: 'Standard-rated, so the same one sixth as eating out.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single employee paid through PAYE, resident in England, Wales or Northern Ireland, with no other income.',
      'Personal allowance of £12,570, reduced by £1 for every £2 of income above £100,000.',
      'No pension contributions, salary sacrifice, student-loan repayments, benefits in kind or tax-code adjustments.'
    ],
    exclusions: [
      'Scottish income-tax bands (Scottish taxpayers are not supported).',
      'Student and postgraduate loan repayments (not a tax).',
      'Marriage Allowance, Blind Person’s Allowance and other reliefs.',
      'Council tax, alcohol, tobacco and vehicle duties, employer National Insurance.'
    ],
    sources: [
      { id: 'hmrc-it-rates', title: 'Income Tax rates and allowances for current and previous tax years', publisher: 'GOV.UK (HM Revenue & Customs)', url: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past', covers: 'Personal allowance, 20/40/45% bands for 2026 to 2027' },
      { id: 'hmrc-freeze-2026-28', title: 'The Personal Allowance and basic rate limit for income tax, and certain NICs thresholds, from 6 April 2026 to 5 April 2028', publisher: 'GOV.UK (HM Treasury / HMRC)', url: 'https://www.gov.uk/government/publications/the-personal-allowance-and-basic-rate-limit-for-income-tax-and-certain-national-insurance-contributions-nics-thresholds-from-6-april-2026-to-5-apr', covers: 'Thresholds frozen for 2026-27' },
      { id: 'hmrc-employer-2026-27', title: 'Rates and thresholds for employers 2026 to 2027', publisher: 'GOV.UK (HMRC)', url: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027', covers: 'Class 1 primary threshold £12,570, UEL £50,270, 8% and 2% employee rates' },
      { id: 'hmrc-vat-rates', title: 'VAT rates on different goods and services', publisher: 'GOV.UK (HMRC)', url: 'https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services', covers: 'Standard 20%, reduced 5%, zero rate' }
    ]
  }
});

export const DEFAULT_YEAR = '2026-27';
