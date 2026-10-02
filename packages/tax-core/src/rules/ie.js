/* Ireland — PAYE income tax, USC and Class A PRSI. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'IE', iso: 'IE', name: 'Ireland', article: '', flag: '🇮🇪', slug: 'ireland',
  currency: { code: 'EUR', symbol: '€', locale: 'en-IE' },
  incomeName: 'Income tax (PAYE)', socialName: 'USC + PRSI', consumptionName: 'VAT',
  note: 'Single PAYE employee, standard personal + employee tax credits (€4,000). USC and Class A PRSI included (4.2% to September, 4.35% from 1 October 2026).',
  tips: [
    ['Pension relief at your top rate', 'Contributions get relief at 40% for higher earners, within age-based limits — the single biggest legal lever.'],
    ['Claim the credits you forget', 'The Rent Tax Credit and 20% medical-expense relief go unclaimed by many people every year.'],
    ['Split bands if married', 'A couple can often move part of the 20% band to the lower earner and cut the total bill.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'IE',
    taxYear: '2026',
    taxYearLabel: 'Tax year 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Taxes Consolidation Act 1997 as amended by the Finance Act 2025; Social Welfare Consolidation Act 2005 (PRSI)',
    currency: 'EUR',
    ruleVersion: 'IE-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      standardRateBand: 44000, standardRate: 0.20, higherRate: 0.40,
      credits: { personal: 2000, employee: 2000 }
    },
    socialTax: {
      usc: { exemptionLimit: 13000, bands: [[0.005, 12012], [0.02, 28700], [0.03, 70044], [0.08, INF]] },
      prsi: {
        /* Class A employee rate: 4.2% from 1 Oct 2025, 4.35% from 1 Oct 2026.
           A full-year 2026 estimate weights them 9 months : 3 months. */
        periods: [{ from: '2026-01-01', rate: 0.042, months: 9 }, { from: '2026-10-01', rate: 0.0435, months: 3 }],
        weeklyThreshold: 352,
        credit: { max: 12, taperStart: 352.01, taperEnd: 424, taperDivisor: 6 }
      }
    },
    indirectTax: {
      name: 'VAT',
      standardRate: 0.23,
      categories: {
        groceries: { effectiveRate: 0.04, nominalRate: 0.0, confidence: 'low', reason: 'Most food is zero-rated; household goods and some foods carry 23%.' },
        dining: { effectiveRate: 0.1007, nominalRate: 0.09, confidence: 'high', reason: 'Food and catering: 13.5% until 30 June 2026 and 9% from 1 July 2026 — averaged over the year.' },
        fuel: { effectiveRate: 0.52, nominalRate: null, confidence: 'med', reason: 'Mineral oil tax, carbon tax and VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1870, nominalRate: 0.23, confidence: 'high', reason: 'Standard 23% rate: 23/123 of a tax-inclusive price.' },
        utilities: { effectiveRate: 0.14, nominalRate: null, confidence: 'med', reason: 'Energy at 9%–13.5%, telecoms at 23%. A blend.' },
        entertainment: { effectiveRate: 0.1870, nominalRate: 0.23, confidence: 'high', reason: 'Standard 23% rate.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single PAYE employee with only employment income, no medical card, under 70.',
      'Personal credit €2,000 and employee credit €2,000; standard rate band €44,000.',
      'Class A PRSI at 4.2% for January–September and 4.35% for October–December 2026, with the weekly €352 threshold and tapered PRSI credit.'
    ],
    exclusions: [
      'Married/civil-partner band transfers and other credits (rent, medical, home carer).',
      'Reduced USC rates for medical-card holders and people over 70.',
      'Local Property Tax.'
    ],
    sources: [
      { id: 'revenue-budget-2026', title: 'Budget 2026 Summary', publisher: 'Revenue (Irish Tax and Customs)', url: 'https://www.revenue.ie/en/corporate/press-office/budget-information/current-year/budget-summary.pdf', covers: 'Rates, bands, credits and USC for 2026' },
      { id: 'gov-budget-2026-tax', title: 'Budget 2026: Taxation Measures', publisher: 'Department of Finance', url: 'https://www.gov.ie/en/department-of-finance/publications/budget-2026-taxation-measures/', covers: 'No change to rates/bands/credits; USC 2% band to €28,700; 9% food & catering VAT from 1 July 2026' },
      { id: 'dsp-prsi-2026', title: 'PRSI 2026 Contribution Rates and User Guide (SW14)', publisher: 'Department of Social Protection', url: 'https://assets.gov.ie/static/documents/cb168977/PRSI_C20260116_Contribution_Rates_and_User_Guide_-_SW_14_-_English_Version_-_January_2026_.pdf-web.pdf', covers: 'Class A 4.2%, increasing to 4.35% on 1 October 2026; €352 weekly threshold and PRSI credit' },
      { id: 'gov-vat-9', title: 'Government Marks Reduction of VAT Rate to 9% for Food Businesses and Hairdressers', publisher: 'Department of Finance', url: 'https://www.gov.ie/en/department-of-finance/press-releases/government-marks-reduction-of-vat-rate-to-9-for-food-businesses-and-hairdressers/', covers: '9% VAT on food and catering from 1 July 2026' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
