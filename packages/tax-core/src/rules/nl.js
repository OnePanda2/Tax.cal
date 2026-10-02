/* Netherlands — Box 1 income tax including national insurance, with the
   general tax credit and the labour tax credit. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'NL', iso: 'NL', name: 'Netherlands', article: 'the', flag: '🇳🇱', slug: 'netherlands',
  currency: { code: 'EUR', symbol: '€', locale: 'nl-NL' },
  incomeName: 'Income tax + national insurance (Box 1)', socialName: null, consumptionName: 'VAT (BTW)',
  note: 'Box 1 rates already include national insurance. The general and labour tax credits (heffingskortingen) are applied for a working-age employee.',
  tips: [
    ['The 30% ruling', 'If you qualify as an incoming employee, up to 30% of your salary can be paid tax-free — worth thousands a year.'],
    ['Mortgage interest is deductible', 'Interest on the loan for your own home reduces your Box 1 income (hypotheekrenteaftrek).'],
    ['Don’t leave credits unclaimed', 'Make sure your employer applies the loonheffingskorting so your tax credits are actually used.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'NL',
    taxYear: '2026',
    taxYearLabel: 'Belastingjaar 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Wet inkomstenbelasting 2001 as amended by the Belastingplan 2026',
    currency: 'EUR',
    ruleVersion: 'NL-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      box1: [[0.3575, 38883], [0.3756, 78426], [0.4950, INF]],
      generalCredit: { max: 3115, phaseOutStart: 29736, phaseOutRate: 0.06398 },
      labourCredit: {
        segments: [
          { upTo: 11965, base: 0, rate: 0.08324, from: 0 },
          { upTo: 25845, base: 996, rate: 0.31009, from: 11965 },
          { upTo: 45592, base: 5300, rate: 0.01950, from: 25845 },
          { upTo: 132920, base: 5685, rate: -0.06510, from: 45592 }
        ],
        max: 5685
      }
    },
    indirectTax: {
      name: 'VAT (BTW)',
      standardRate: 0.21,
      categories: {
        groceries: { effectiveRate: 0.07, nominalRate: 0.09, confidence: 'med', reason: 'Food at 9%; household goods and drinks at 21%.' },
        dining: { effectiveRate: 0.0826, nominalRate: 0.09, confidence: 'high', reason: 'Restaurant food at 9%: 9/109 of a tax-inclusive price.' },
        fuel: { effectiveRate: 0.55, nominalRate: null, confidence: 'med', reason: 'Excise plus VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1736, nominalRate: 0.21, confidence: 'high', reason: 'Standard 21% rate: 21/121 of a tax-inclusive price.' },
        utilities: { effectiveRate: 0.15, nominalRate: null, confidence: 'med', reason: 'Energy tax plus VAT on energy and telecoms. A blend.' },
        entertainment: { effectiveRate: 0.1736, nominalRate: 0.21, confidence: 'high', reason: 'Mostly standard-rated.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'not_applicable', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single employee below state-pension (AOW) age with only employment income in Box 1.',
      'General tax credit (max €3,115, reduced by 6.398% above €29,736) and labour tax credit (max €5,685, using the 2026 build-up and phase-out) applied in full.',
      'Employee national-insurance premiums are inside the Box 1 rates; the income-dependent health contribution (Zvw) is paid by the employer.'
    ],
    exclusions: [
      'The 30% ruling, mortgage interest deduction and Box 2/Box 3 income.',
      'Fiscal partners, AOW-age rates and other credits (e.g. income-dependent combination credit).',
      'The nominal private health-insurance premium (not a tax).'
    ],
    sources: [
      { id: 'bd-box1-2026', title: 'Box 1: uitleg en tarieven', publisher: 'Belastingdienst', url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/box_1/box_1', covers: '2026: 35.75% to €38,883; 37.56% to €78,426; 49.50% above' },
      { id: 'bd-ahk-2026', title: 'Tabel algemene heffingskorting 2026', publisher: 'Belastingdienst', url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/algemene_heffingskorting/tabel-algemene-heffingskorting-2026', covers: 'Max €3,115; reduced by 6.398% above €29,736' },
      { id: 'bd-ak-2026', title: 'Tabel arbeidskorting 2026', publisher: 'Belastingdienst', url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/tabel-arbeidskorting-2026', covers: 'Labour credit build-up and phase-out segments, max €5,685' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
